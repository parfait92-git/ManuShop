"use server";

import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebaseAdmin";
import { sendOrderNotification } from "@/lib/whatsappBusiness";
import type { OrderStatus } from "@/models/order/OrderStatus";
import { requireCaller } from "@/server/auth/requireCaller";
import { ForbiddenError, NotFoundError, ValidationError } from "@/server/errors";
import { effectivePrice, type PromoFields } from "@/lib/promo";
import { ensureInvoice } from "@/server/invoices/issueInvoice";
import { queueNotification } from "@/server/notifications";

const ORDERS_COLLECTION = "orders";
const PRODUCT_COSTS_COLLECTION = "productCosts";
const ORDER_COSTS_COLLECTION = "orderCosts";
const PRODUCTS_COLLECTION = "products";
const USERS_COLLECTION = "users";
const SHOPS_COLLECTION = "shops";

const RESTOCK_STATUSES: OrderStatus[] = ["cancelled", "returned", "defective"];

export interface OrderItemInput {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateOrderActionInput {
  shopId: string;
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  items: OrderItemInput[];
  subtotal: number;
  discount?: number;
  total: number;
  notes?: string;
  /** BF-21 : commande manuelle enregistrée par le commerçant pour un client
   * physique (walk-in), sans compte. Sans ce flag, la commande est liée au
   * compte de l'appelant (`clientId`) — n'importe quel compte connecté peut
   * commander pour lui-même, quel que soit son rôle (voir `ProtectedRoute`
   * sans `allowedRoles` sur `/checkout/payment`). */
  manual?: boolean;
}

/**
 * Écrit la commande et décrémente le stock des articles commandés dans une
 * transaction Firestore (pas un simple batch, qui ne lit jamais rien) :
 * chaque produit est relu ici pour vérifier `stock >= quantity` avant
 * d'écrire quoi que ce soit — la seule façon d'empêcher la survente sans
 * risquer une course avec une autre commande concurrente sur le même
 * produit (voir 04-besoins-techniques.md §32 ; auparavant documenté comme
 * limite connue, jamais vérifié). Le contrôle client (`cartStore`, borne la
 * quantité au stock connu au moment de l'ajout) reste une aide au confort,
 * jamais la seule vérification — le stock a pu changer depuis.
 */
export async function createOrderAction(
  idToken: string,
  input: CreateOrderActionInput
): Promise<{ orderId: string }> {
  const caller = await requireCaller(idToken);
  const db = getAdminDb();

  let clientId: string | undefined = caller.uid;
  if (input.manual) {
    const callerSnapshot = await db
      .collection(USERS_COLLECTION)
      .doc(caller.uid)
      .get();
    const callerData = callerSnapshot.data();
    const isMerchantOfShop =
      !!callerData &&
      ["admin", "seller"].includes(callerData.role) &&
      callerData.shopId === input.shopId;
    if (!isMerchantOfShop) {
      throw new ForbiddenError();
    }
    clientId = undefined;
  }

  const orderRef = db.collection(ORDERS_COLLECTION).doc();
  // Montants réellement enregistrés, fixés dans la transaction (voir plus
  // bas) — relus ensuite pour la notification au commerçant.
  let total = input.total;
  const productRefs = input.items.map((item) =>
    db.collection(PRODUCTS_COLLECTION).doc(item.productId)
  );

  await db.runTransaction(async (transaction) => {
    // Toutes les lectures d'une transaction Firestore doivent précéder ses
    // écritures — d'où la vérification ici plutôt qu'avant `runTransaction`
    // (qui ne serait pas protégée contre une commande concurrente modifiant
    // le stock entre la lecture et l'écriture).
    const productSnapshots = await Promise.all(
      productRefs.map((ref) => transaction.get(ref))
    );
    // Prix d'achat du moment, figés avec la commande (`orderCosts`) : un
    // prix d'achat modifié plus tard ne doit pas réécrire les gains passés.
    const costSnapshots = await Promise.all(
      input.items.map((item) =>
        transaction.get(db.collection(PRODUCT_COSTS_COLLECTION).doc(item.productId))
      )
    );

    input.items.forEach((item, index) => {
      // Sans prix lisible, la commande en ligne ne peut pas être chiffrée
      // (le prix n'est plus repris du panier, voir plus bas).
      // Une commande concerne une seule boutique : refuser un article d'une
      // autre (le panier le garantit côté client, `useAddToCart`, mais une
      // requête peut toujours être forgée).
      if (productSnapshots[index].data()?.shopId !== input.shopId) {
        throw new ValidationError(
          `« ${item.name} » n'appartient pas à cette boutique.`
        );
      }
      const currentPrice = productSnapshots[index].data()?.price;
      if (!input.manual && typeof currentPrice !== "number") {
        throw new ValidationError(`Le produit « ${item.name} » n'est plus disponible.`);
      }
      const currentStock = productSnapshots[index].data()?.stock;
      const available = typeof currentStock === "number" ? currentStock : 0;
      if (available < item.quantity) {
        throw new ValidationError(
          `Stock insuffisant pour « ${item.name} » (${available} disponible${available > 1 ? "s" : ""}).`
        );
      }
    });

    // Commande en ligne : le prix de chaque article est recalculé ici depuis
    // le produit, au prix en vigueur à cet instant, plutôt que repris du
    // panier. Le panier est conservé dans le navigateur avec le prix du
    // moment de l'ajout : sans ça, un article ajouté pendant une promotion
    // puis commandé après sa date de fin serait encore facturé au prix promo
    // (et un client pourrait envoyer n'importe quel prix). La commande
    // manuelle garde le prix saisi par le commerçant lui-même.
    const now = new Date();
    const items = input.manual
      ? input.items
      : input.items.map((item, index) => ({
          ...item,
          unitPrice: effectivePrice(
            productSnapshots[index].data() as PromoFields,
            now
          ),
        }));
    const subtotal = input.manual
      ? input.subtotal
      : items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const discount = input.discount ?? 0;
    total = input.manual ? input.total : Math.max(subtotal - discount, 0);

    transaction.set(orderRef, {
      shopId: input.shopId,
      ...(clientId ? { clientId } : {}),
      clientName: input.clientName,
      clientPhone: input.clientPhone,
      clientAddress: input.clientAddress,
      items,
      subtotal,
      discount,
      total,
      status: "under_review" satisfies OrderStatus,
      notes: input.notes ?? "",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // À part de la commande, que le client peut lire (il y verrait la marge
    // du commerçant) — lisible par le seul gérant (firestore.rules).
    transaction.set(db.collection(ORDER_COSTS_COLLECTION).doc(orderRef.id), {
      shopId: input.shopId,
      items: input.items.map((item, index) => {
        const unitCost = costSnapshots[index].data()?.purchasePrice;
        return typeof unitCost === "number"
          ? { productId: item.productId, unitCost }
          : { productId: item.productId };
      }),
      createdAt: FieldValue.serverTimestamp(),
    });

    productRefs.forEach((ref, index) => {
      transaction.update(ref, {
        stock: FieldValue.increment(-input.items[index].quantity),
      });
    });
  });

  const shopSnapshot = await db.collection(SHOPS_COLLECTION).doc(input.shopId).get();
  const shop = shopSnapshot.data() as
    | { whatsapp?: string; notifyOrdersBySocial?: boolean }
    | undefined;
  if (shop && shop.notifyOrdersBySocial !== false) {
    await sendOrderNotification({
      shopWhatsapp: shop.whatsapp ?? "",
      orderId: orderRef.id,
      clientName: input.clientName,
      total,
    });
  }

  return { orderId: orderRef.id };
}

export interface UpdateOrderStatusActionInput {
  status: OrderStatus;
  /** `cancelReason` si `status === "cancelled"`, `returnReason` si
   * `status === "returned" | "defective"` — requis dans les deux cas. */
  reason?: string;
}

/**
 * Revalide l'autorisation et la transition en code (pas seulement côté
 * client) avant d'écrire :
 * - progression normale (ready_for_delivery/delivering/delivered) :
 *   commerçant (admin/seller) de la boutique de la commande uniquement.
 * - annulation (BF-23) : client propriétaire OU commerçant, uniquement
 *   depuis `under_review` (avant expédition), motif obligatoire.
 * - retour/défectueux (BF-96/97) : commerçant uniquement, uniquement depuis
 *   `delivered`, motif obligatoire — réincrémente le stock des articles.
 */
export async function updateOrderStatusAction(
  idToken: string,
  orderId: string,
  input: UpdateOrderStatusActionInput
): Promise<void> {
  const caller = await requireCaller(idToken);
  const db = getAdminDb();

  const orderRef = db.collection(ORDERS_COLLECTION).doc(orderId);
  const orderSnapshot = await orderRef.get();
  if (!orderSnapshot.exists) {
    throw new NotFoundError("Commande introuvable.");
  }
  const order = orderSnapshot.data() as {
    shopId: string;
    clientId?: string;
    status: OrderStatus;
    items: { productId: string; quantity: number }[];
  };

  const callerSnapshot = await db.collection(USERS_COLLECTION).doc(caller.uid).get();
  const callerData = callerSnapshot.data();
  const isMerchant =
    !!callerData &&
    ["admin", "seller"].includes(callerData.role) &&
    callerData.shopId === order.shopId;
  const isOwner = order.clientId === caller.uid;

  if (input.status === "cancelled") {
    if (!isMerchant && !isOwner) throw new ForbiddenError();
    if (order.status !== "under_review") {
      throw new ValidationError(
        "Cette commande ne peut plus être annulée : elle est déjà en préparation."
      );
    }
    if (!input.reason?.trim()) {
      throw new ValidationError("Un motif d'annulation est requis.");
    }
  } else if (input.status === "returned" || input.status === "defective") {
    if (!isMerchant) throw new ForbiddenError();
    if (order.status !== "delivered") {
      throw new ValidationError(
        "Seule une commande livrée peut être marquée retournée ou défectueuse."
      );
    }
    if (!input.reason?.trim()) {
      throw new ValidationError("Un motif est requis.");
    }
  } else {
    if (!isMerchant) throw new ForbiddenError();
  }

  const needsRestock = RESTOCK_STATUSES.includes(input.status);
  const batch = db.batch();
  batch.update(orderRef, {
    status: input.status,
    ...(input.status === "cancelled" ? { cancelReason: input.reason } : {}),
    ...(input.status === "returned" || input.status === "defective"
      ? { returnReason: input.reason }
      : {}),
    ...(needsRestock ? { restockedAt: FieldValue.serverTimestamp() } : {}),
    updatedAt: FieldValue.serverTimestamp(),
  });

  if (needsRestock) {
    for (const item of order.items ?? []) {
      batch.update(db.collection(PRODUCTS_COLLECTION).doc(item.productId), {
        stock: FieldValue.increment(item.quantity),
      });
    }
  }

  // Commande livrée à un client qui a un compte : on l'invite à donner son
  // avis (livraison, puis chaque article). Dans le même lot que le
  // changement de statut. Pas de doublon si la commande était déjà livrée ;
  // une commande manuelle (sans compte) n'a personne à notifier.
  if (input.status === "delivered" && order.status !== "delivered" && order.clientId) {
    const shopSnapshot = await db.collection(SHOPS_COLLECTION).doc(order.shopId).get();
    const shopName = (shopSnapshot.data()?.name as string | undefined) ?? "la boutique";
    queueNotification(db, batch, {
      userId: order.clientId,
      type: "review_request",
      orderId,
      shopId: order.shopId,
      message: `${shopName} : votre commande est livrée. Comment s'est passée la livraison, et que pensez-vous de vos articles ?`,
    });
  }

  await batch.commit();

  // Facture émise dès la livraison (BF-24), après l'écriture du statut :
  // un échec ici ne doit pas annuler la livraison — la facture sera alors
  // émise au premier téléchargement (`ensureInvoice` est idempotente).
  if (input.status === "delivered" && order.status !== "delivered") {
    try {
      await ensureInvoice(db, orderId);
    } catch (error) {
      console.error("updateOrderStatusAction : échec de l'émission de la facture", error);
    }
  }
}

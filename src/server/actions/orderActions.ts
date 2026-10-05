"use server";

import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebaseAdmin";
import { sendOrderNotification } from "@/lib/whatsappBusiness";
import type { OrderStatus } from "@/models/order/OrderStatus";
import { requireCaller } from "@/server/auth/requireCaller";
import { ForbiddenError, NotFoundError, ValidationError } from "@/server/errors";
import { effectivePrice, type PromoFields } from "@/lib/promo";
import { appendHistoryEvent, nextHistoryEvent, type HistoryHead } from "@/server/integrity/orderHistory";
import { ensureInvoice } from "@/server/invoices/issueInvoice";
import { queueNotification } from "@/server/notifications";
import {
  pushNewOrder,
  pushOrderCancelledByClient,
  pushOrderStatus,
  pushStockAlerts,
  type StockAlert,
} from "@/server/push/events";
import { queueStockMovement } from "@/server/stock/stockMovements";
import { hasVariants, lineName, variantPrice, type VariantFields } from "@/lib/variants";
import type { ProductVariant } from "@/models/product/ProductVariant";

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
  /** Version choisie (BF-17), pour un produit qui en a. */
  variantId?: string;
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
  /** Commande manuelle : le membre de l'équipe qui l'enregistre, inscrit
   * dans l'historique du stock. */
  let manualActor: { actorId: string; actorName: string } | undefined;
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
    manualActor = {
      actorId: caller.uid,
      actorName: (callerData.displayName as string | undefined) || (callerData.email as string | undefined) || "Équipe",
    };
  }

  const orderRef = db.collection(ORDERS_COLLECTION).doc();
  // Montants réellement enregistrés, fixés dans la transaction (voir plus
  // bas) — relus ensuite pour la notification au commerçant.
  let total = input.total;
  const productRefs = input.items.map((item) =>
    db.collection(PRODUCTS_COLLECTION).doc(item.productId)
  );
  /** Stocks qui passent sous leur seuil d'alerte avec cette commande. */
  const stockAlerts: StockAlert[] = [];

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

    // Version commandée (BF-17) : obligatoire pour un produit qui en a,
    // interdite sinon ; quantités cumulées par produit et par version (deux
    // lignes peuvent viser le même stock).
    const wanted = new Map<string, number>();
    const stockKey = (item: OrderItemInput) => (item.variantId ? `${item.productId}::${item.variantId}` : item.productId);
    const variantOf = (index: number): ProductVariant | undefined => {
      const variants = productSnapshots[index].data()?.variants as Record<string, ProductVariant> | undefined;
      const id = input.items[index].variantId;
      return id ? variants?.[id] : undefined;
    };
    input.items.forEach((item, index) => {
      const product = productSnapshots[index].data();
      // Sans prix lisible, la commande en ligne ne peut pas être chiffrée
      // (le prix n'est plus repris du panier, voir plus bas).
      // Une commande concerne une seule boutique : refuser un article d'une
      // autre (le panier le garantit côté client, `useAddToCart`, mais une
      // requête peut toujours être forgée).
      if (product?.shopId !== input.shopId) {
        throw new ValidationError(
          `« ${item.name} » n'appartient pas à cette boutique.`
        );
      }
      const currentPrice = product?.price;
      if (!input.manual && typeof currentPrice !== "number") {
        throw new ValidationError(`Le produit « ${item.name} » n'est plus disponible.`);
      }
      if (hasVariants({ variants: product?.variants })) {
        if (!variantOf(index)) {
          throw new ValidationError(`Choisissez une version de « ${item.name} » (elle n'existe plus, ou n'a pas été choisie).`);
        }
      } else if (item.variantId) {
        throw new ValidationError(`« ${item.name} » n'existe pas en plusieurs versions.`);
      }
      wanted.set(stockKey(item), (wanted.get(stockKey(item)) ?? 0) + item.quantity);
    });
    input.items.forEach((item, index) => {
      const variant = variantOf(index);
      const currentStock = variant ? variant.stock : productSnapshots[index].data()?.stock;
      const available = typeof currentStock === "number" ? currentStock : 0;
      if (available < (wanted.get(stockKey(item)) ?? item.quantity)) {
        throw new ValidationError(
          `Stock insuffisant pour « ${lineName(item.name, variant?.label)} » (${available} disponible${available > 1 ? "s" : ""}).`
        );
      }
    });

    // Commande en ligne : le prix de chaque article est recalculé ici depuis
    // le produit, au prix en vigueur à cet instant, plutôt que repris du
    // panier. Le panier est conservé dans le navigateur avec le prix du
    // moment de l'ajout : sans ça, un article ajouté pendant une promotion
    // puis commandé après sa date de fin serait encore facturé au prix promo
    // (et un client pourrait envoyer n'importe quel prix). La commande
    // manuelle garde le prix saisi par le commerçant lui-même. Une version
    // a son prix propre, sinon celui du produit.
    const now = new Date();
    const items = input.items.map((item, index) => {
      const product = productSnapshots[index].data();
      const variant = variantOf(index);
      const unitPrice = input.manual
        ? item.unitPrice
        : variant
          ? variantPrice(product as VariantFields, variant, now)
          : effectivePrice(product as PromoFields, now);
      if (!variant) return { ...item, unitPrice };
      return {
        productId: item.productId,
        name: lineName((product?.name as string | undefined) ?? item.name, variant.label),
        quantity: item.quantity,
        unitPrice,
        variantId: item.variantId,
        variantLabel: variant.label,
      };
    });
    const subtotal = input.manual
      ? input.subtotal
      : items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const discount = input.discount ?? 0;
    total = input.manual ? input.total : Math.max(subtotal - discount, 0);

    // Premier maillon de l'historique signé de la commande (2026-10-03).
    const created = nextHistoryEvent(orderRef.id, {}, { type: "status", status: "under_review" }, now);

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
      historySeq: created.seq,
      historyHash: created.hash,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    appendHistoryEvent(db, transaction, orderRef.id, created);

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

    // Stock : une seule écriture par produit (total et versions), en
    // incréments — deux commandes simultanées ne s'écrasent pas.
    const updates = new Map<string, { ref: (typeof productRefs)[number]; data: Record<string, unknown>; total: number }>();
    input.items.forEach((item, index) => {
      const entry = updates.get(item.productId) ?? { ref: productRefs[index], data: {}, total: 0 };
      entry.total += item.quantity;
      if (item.variantId) {
        const field = `variants.${item.variantId}.stock`;
        entry.data[field] = (entry.data[field] as number | undefined ?? 0) + item.quantity;
      }
      updates.set(item.productId, entry);
    });
    updates.forEach(({ ref, data, total }) => {
      transaction.update(ref, {
        stock: FieldValue.increment(-total),
        ...Object.fromEntries(Object.entries(data).map(([field, qty]) => [field, FieldValue.increment(-(qty as number))])),
      });
    });

    // Historique du stock (BF-15) : une sortie par article, avec le stock
    // restant (de la version s'il y en a une). Cumulé si un même stock
    // figure sur deux lignes.
    const remaining = new Map<string, number>();
    input.items.forEach((item, index) => {
      const product = productSnapshots[index].data();
      const variant = variantOf(index);
      const start = variant ? variant.stock : typeof product?.stock === "number" ? product.stock : 0;
      const before = remaining.get(stockKey(item)) ?? start;
      const stockAfter = before - item.quantity;
      remaining.set(stockKey(item), stockAfter);
      // Alerte une seule fois, au passage du seuil (pas à chaque commande
      // suivante) ; sur le stock final de la ligne cumulée.
      const threshold = typeof product?.stockThreshold === "number" ? product.stockThreshold : 0;
      const isLastLine = input.items.findLastIndex((other) => stockKey(other) === stockKey(item)) === index;
      if (isLastLine && start > threshold && stockAfter <= threshold) {
        stockAlerts.push({ name: lineName((product?.name as string | undefined) ?? item.name, variant?.label), stock: stockAfter });
      }
      queueStockMovement(db, transaction, {
        shopId: input.shopId,
        productId: item.productId,
        productName: lineName((product?.name as string | undefined) ?? item.name, variant?.label),
        ...(variant ? { variantId: item.variantId, variantLabel: variant.label } : {}),
        type: "order",
        quantity: -item.quantity,
        stockAfter,
        orderId: orderRef.id,
        ...manualActor,
      });
    });
  });

  // Notifications push (2026-10-04) : la commande est déjà enregistrée,
  // un échec d'envoi n'y change rien (`sendPush` n'échoue jamais).
  await Promise.all([
    input.manual
      ? Promise.resolve(0)
      : pushNewOrder(db, {
          shopId: input.shopId,
          orderId: orderRef.id,
          clientName: input.clientName,
          units: input.items.reduce((sum, item) => sum + item.quantity, 0),
          total,
        }),
    pushStockAlerts(db, input.shopId, stockAlerts),
  ]);

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
    items: { productId: string; quantity: number; name?: string; variantId?: string; variantLabel?: string }[];
  } & HistoryHead;

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
  // Stock actuel des articles, pour l'historique du stock (BF-15). Lu juste
  // avant l'écriture (un lot ne lit rien) : le stock affiché « après » peut
  // différer d'une unité si une commande passe dans l'intervalle — la
  // variation, elle, est exacte. Un produit supprimé depuis n'est plus
  // remis en stock (sa mise à jour ferait échouer tout le lot).
  const restockProducts = needsRestock
    ? await Promise.all(
        (order.items ?? []).map((item) =>
          db.collection(PRODUCTS_COLLECTION).doc(item.productId).get()
        )
      )
    : [];
  const batch = db.batch();
  // Maillon suivant de l'historique signé, dans le même lot que le statut :
  // l'un n'existe jamais sans l'autre.
  const head = appendHistoryEvent(
    db,
    batch,
    orderId,
    nextHistoryEvent(orderId, order, { type: "status", status: input.status })
  );
  batch.update(orderRef, {
    ...head,
    status: input.status,
    ...(input.status === "cancelled" ? { cancelReason: input.reason } : {}),
    ...(input.status === "returned" || input.status === "defective"
      ? { returnReason: input.reason }
      : {}),
    ...(needsRestock ? { restockedAt: FieldValue.serverTimestamp() } : {}),
    updatedAt: FieldValue.serverTimestamp(),
  });

  if (needsRestock) {
    // Une écriture par produit (total et versions), en incréments. Une
    // version supprimée depuis n'est pas recréée : sa ligne est ignorée,
    // comme un produit supprimé.
    const updates = new Map<string, Record<string, number>>();
    const running = new Map<string, number>();
    (order.items ?? []).forEach((item, index) => {
      const snapshot = restockProducts[index];
      if (!snapshot?.exists) return;
      const product = snapshot.data() ?? {};
      const variants = product.variants as Record<string, ProductVariant> | undefined;
      const variant = item.variantId ? variants?.[item.variantId] : undefined;
      if (item.variantId && !variant) return;
      const fields = updates.get(item.productId) ?? {};
      fields.stock = (fields.stock ?? 0) + item.quantity;
      if (variant) {
        const field = `variants.${item.variantId}.stock`;
        fields[field] = (fields[field] ?? 0) + item.quantity;
      }
      updates.set(item.productId, fields);

      const key = variant ? `${item.productId}::${item.variantId}` : item.productId;
      const start = variant ? variant.stock : typeof product.stock === "number" ? product.stock : 0;
      const stockAfter = (running.get(key) ?? start) + item.quantity;
      running.set(key, stockAfter);
      queueStockMovement(db, batch, {
        shopId: order.shopId,
        productId: item.productId,
        productName: lineName((product.name as string | undefined) ?? item.name ?? "", variant?.label),
        ...(variant ? { variantId: item.variantId, variantLabel: variant.label } : {}),
        type: input.status as "cancelled" | "returned" | "defective",
        quantity: item.quantity,
        stockAfter,
        orderId,
        note: input.reason?.trim(),
        actorId: caller.uid,
        actorName:
          (callerData?.displayName as string | undefined) ||
          (callerData?.email as string | undefined) ||
          (isMerchant ? "Équipe" : "Client"),
      });
    });
    updates.forEach((fields, productId) => {
      batch.update(
        db.collection(PRODUCTS_COLLECTION).doc(productId),
        Object.fromEntries(Object.entries(fields).map(([field, qty]) => [field, FieldValue.increment(qty)]))
      );
    });
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

  // Notification push : au client quand la boutique fait avancer sa
  // commande ; à l'équipe quand c'est le client qui annule.
  if (isOwner && !isMerchant) {
    await pushOrderCancelledByClient(db, {
      shopId: order.shopId,
      orderId,
      clientName: String(orderSnapshot.data()?.clientName ?? "Un client"),
    });
  } else if (order.clientId && order.clientId !== caller.uid) {
    const shopName = String((await db.collection(SHOPS_COLLECTION).doc(order.shopId).get()).data()?.name ?? "La boutique");
    await pushOrderStatus(db, { clientId: order.clientId, orderId, status: input.status, shopName });
  }

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

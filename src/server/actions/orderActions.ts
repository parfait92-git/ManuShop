"use server";

import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebaseAdmin";
import { sendOrderNotification } from "@/lib/whatsappBusiness";
import type { OrderStatus } from "@/models/order/OrderStatus";
import { requireCaller } from "@/server/auth/requireCaller";
import { ForbiddenError, NotFoundError, ValidationError } from "@/server/errors";

const ORDERS_COLLECTION = "orders";
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
 * Écrit la commande et décrémente le stock des articles commandés dans le
 * même batch (atomique) — jamais l'un sans l'autre. Le stock n'est pas borné
 * à 0 ici (pas de vérification de survente) : mécanique minimale en
 * attendant le Module 3 (Stock), documentée comme limite connue.
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
  const batch = db.batch();

  batch.set(orderRef, {
    shopId: input.shopId,
    ...(clientId ? { clientId } : {}),
    clientName: input.clientName,
    clientPhone: input.clientPhone,
    clientAddress: input.clientAddress,
    items: input.items,
    subtotal: input.subtotal,
    discount: input.discount ?? 0,
    total: input.total,
    status: "under_review" satisfies OrderStatus,
    notes: input.notes ?? "",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  for (const item of input.items) {
    batch.update(db.collection(PRODUCTS_COLLECTION).doc(item.productId), {
      stock: FieldValue.increment(-item.quantity),
    });
  }

  await batch.commit();

  const shopSnapshot = await db.collection(SHOPS_COLLECTION).doc(input.shopId).get();
  const shop = shopSnapshot.data() as
    | { whatsapp?: string; notifyOrdersBySocial?: boolean }
    | undefined;
  if (shop && shop.notifyOrdersBySocial !== false) {
    await sendOrderNotification({
      shopWhatsapp: shop.whatsapp ?? "",
      orderId: orderRef.id,
      clientName: input.clientName,
      total: input.total,
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

  await batch.commit();
}

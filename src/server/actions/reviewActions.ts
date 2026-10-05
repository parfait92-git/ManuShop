"use server";

import { pushNewReview } from "@/server/push/events";
import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebaseAdmin";
import { requireCaller } from "@/server/auth/requireCaller";
import { ForbiddenError, NotFoundError, ValidationError } from "@/server/errors";

const ORDERS_COLLECTION = "orders";
const REVIEWS_COLLECTION = "reviews";

export interface SubmitReviewActionInput {
  orderId: string;
  productId: string;
  rating?: number;
  comment: string;
  /** BF-76 : signale une commande défectueuse plutôt qu'un avis ordinaire —
   * transmis au commerçant (visible sur ses commandes livrées). */
  reason?: "defective";
}

/**
 * BF-76 : un client laisse un avis sur un article d'une commande qui lui
 * appartient réellement et qui est réellement livrée — revalidé ici plutôt
 * que de faire confiance au client, même raisonnement que
 * `updateOrderStatusAction` (`orderActions.ts`). Passe par `firebase-admin`
 * comme toutes les écritures sensibles de ce projet : `firestore.rules`
 * verrouille entièrement `reviews` en écriture (`allow write: if false`).
 */
export async function submitReviewAction(
  idToken: string,
  input: SubmitReviewActionInput
): Promise<{ reviewId: string }> {
  const caller = await requireCaller(idToken);
  const db = getAdminDb();

  const orderRef = db.collection(ORDERS_COLLECTION).doc(input.orderId);
  const orderSnapshot = await orderRef.get();
  if (!orderSnapshot.exists) {
    throw new NotFoundError("Commande introuvable.");
  }
  const order = orderSnapshot.data() as {
    shopId: string;
    clientId?: string;
    status: string;
    clientName?: string;
    items: { productId: string; name?: string }[];
  };

  if (order.clientId !== caller.uid) {
    throw new ForbiddenError();
  }
  if (order.status !== "delivered") {
    throw new ValidationError(
      "Seule une commande livrée peut recevoir un avis."
    );
  }
  if (!order.items?.some((item) => item.productId === input.productId)) {
    throw new ValidationError("Cet article ne fait pas partie de la commande.");
  }
  if (!input.comment.trim()) {
    throw new ValidationError("Un commentaire est requis.");
  }

  // Un seul avis par article et par commande — évite un doublon si le
  // client rouvre le dialogue après un premier envoi réussi.
  const existing = await db
    .collection(REVIEWS_COLLECTION)
    .where("orderId", "==", input.orderId)
    .where("productId", "==", input.productId)
    .limit(1)
    .get();
  if (!existing.empty) {
    throw new ValidationError(
      "Vous avez déjà laissé un avis pour cet article."
    );
  }

  const reviewRef = db.collection(REVIEWS_COLLECTION).doc();
  await reviewRef.set({
    productId: input.productId,
    shopId: order.shopId,
    orderId: input.orderId,
    authorId: caller.uid,
    ...(input.rating !== undefined ? { rating: input.rating } : {}),
    comment: input.comment.trim(),
    ...(input.reason ? { reason: input.reason } : {}),
    createdAt: FieldValue.serverTimestamp(),
  });

  const item = order.items?.find((i) => i.productId === input.productId);
  await pushNewReview(db, {
    shopId: order.shopId,
    clientName: String(order.clientName ?? "Un client"),
    subject: item?.name ? `« ${item.name} »` : "un article",
  });
  return { reviewId: reviewRef.id };
}

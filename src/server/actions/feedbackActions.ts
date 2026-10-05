"use server";

import { pushNewReview, pushReviewReply } from "@/server/push/events";
import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebaseAdmin";
import { requireCaller } from "@/server/auth/requireCaller";
import { ForbiddenError, NotFoundError, ValidationError } from "@/server/errors";
import { queueNotification } from "@/server/notifications";

const ORDERS_COLLECTION = "orders";
const REVIEWS_COLLECTION = "reviews";
const FEEDBACK_COLLECTION = "orderFeedback";
const USERS_COLLECTION = "users";
const SHOPS_COLLECTION = "shops";

const COMMENT_MAX = 1000;
const REPLY_MAX = 1000;

function checkRating(rating: number | undefined): void {
  if (rating !== undefined && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
    throw new ValidationError("La note doit être comprise entre 1 et 5.");
  }
}

export interface SubmitDeliveryFeedbackInput {
  orderId: string;
  rating?: number;
  comment: string;
}

/**
 * Avis du client sur la **livraison** d'une commande (2026-10-02) — privé
 * (`orderFeedback/{orderId}`, lu par le client et l'équipe de la boutique).
 * Revérifié ici : commande du client, livrée, un seul avis par commande.
 */
export async function submitDeliveryFeedbackAction(
  idToken: string,
  input: SubmitDeliveryFeedbackInput
): Promise<void> {
  const caller = await requireCaller(idToken);
  const db = getAdminDb();

  const orderSnapshot = await db.collection(ORDERS_COLLECTION).doc(input.orderId).get();
  if (!orderSnapshot.exists) throw new NotFoundError("Commande introuvable.");
  const order = orderSnapshot.data() as {
    shopId: string;
    clientId?: string;
    clientName: string;
    status: string;
  };
  if (order.clientId !== caller.uid) throw new ForbiddenError();
  if (order.status !== "delivered") {
    throw new ValidationError("Seule une commande livrée peut recevoir un avis.");
  }

  const comment = input.comment.trim();
  if (!comment) throw new ValidationError("Un commentaire est requis.");
  if (comment.length > COMMENT_MAX) {
    throw new ValidationError(`${COMMENT_MAX} caractères au maximum.`);
  }
  checkRating(input.rating);

  const feedbackRef = db.collection(FEEDBACK_COLLECTION).doc(input.orderId);
  // `create` échoue si l'avis existe déjà : un seul avis de livraison par
  // commande, même avec deux envois simultanés.
  try {
    await feedbackRef.create({
      orderId: input.orderId,
      shopId: order.shopId,
      clientId: caller.uid,
      clientName: order.clientName,
      ...(input.rating !== undefined ? { rating: input.rating } : {}),
      comment,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    if ((error as { code?: number }).code === 6) {
      throw new ValidationError("Vous avez déjà donné votre avis sur cette livraison.");
    }
    throw error;
  }
  await pushNewReview(db, { shopId: order.shopId, clientName: order.clientName, subject: "sa livraison" });
}

export interface ReplyToFeedbackInput {
  /** Avis sur la livraison (id = commande) ou sur un article (id = avis). */
  target: "delivery" | "review";
  id: string;
  text: string;
}

/**
 * Réponse du commerçant à un avis (2026-10-02) : réservée à l'équipe de la
 * boutique concernée (gérant ou vendeur). Le client est notifié dans
 * l'application. Une réponse peut être modifiée (la nouvelle remplace
 * l'ancienne). Sur un article, elle est publique, affichée sous l'avis.
 */
export async function replyToFeedbackAction(
  idToken: string,
  input: ReplyToFeedbackInput
): Promise<void> {
  const caller = await requireCaller(idToken);
  const db = getAdminDb();

  const text = input.text.trim();
  if (!text) throw new ValidationError("Votre réponse est vide.");
  if (text.length > REPLY_MAX) throw new ValidationError(`${REPLY_MAX} caractères au maximum.`);

  const ref =
    input.target === "delivery"
      ? db.collection(FEEDBACK_COLLECTION).doc(input.id)
      : db.collection(REVIEWS_COLLECTION).doc(input.id);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new NotFoundError("Avis introuvable.");
  const feedback = snapshot.data() as {
    shopId: string;
    orderId: string;
    clientId?: string;
    authorId?: string;
  };

  const callerData = (await db.collection(USERS_COLLECTION).doc(caller.uid).get()).data();
  const isMerchant =
    !!callerData &&
    ["admin", "seller"].includes(callerData.role) &&
    callerData.shopId === feedback.shopId;
  if (!isMerchant) throw new ForbiddenError();

  const clientId = feedback.clientId ?? feedback.authorId;
  const shopName =
    ((await db.collection(SHOPS_COLLECTION).doc(feedback.shopId).get()).data()?.name as
      | string
      | undefined) ?? "La boutique";

  const batch = db.batch();
  batch.update(ref, {
    reply: {
      text,
      authorName: (callerData.displayName as string | undefined) ?? shopName,
      repliedAt: FieldValue.serverTimestamp(),
    },
  });
  if (clientId) {
    queueNotification(db, batch, {
      userId: clientId,
      type: "review_reply",
      orderId: feedback.orderId,
      shopId: feedback.shopId,
      message:
        input.target === "delivery"
          ? `${shopName} a répondu à votre avis sur la livraison.`
          : `${shopName} a répondu à votre avis sur un article.`,
    });
  }
  await batch.commit();
  if (clientId) await pushReviewReply(db, { clientId, shopName, orderId: feedback.orderId });
}

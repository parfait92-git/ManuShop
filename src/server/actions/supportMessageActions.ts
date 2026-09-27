"use server";

import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebaseAdmin";
import { requireCaller } from "@/server/auth/requireCaller";
import { requireSuperAdmin } from "@/server/auth/requireSuperAdmin";
import { ForbiddenError, NotFoundError, ValidationError } from "@/server/errors";

const SUPPORT_MESSAGES_COLLECTION = "supportMessages";
const USERS_COLLECTION = "users";
const SHOPS_COLLECTION = "shops";

/**
 * DTO traversant la frontière Server Action — mêmes raisons que
 * `SearchedUserDto` (`platformAdminActions.ts`) : un `Timestamp` ne
 * survit pas à la sérialisation RSC telle quelle.
 */
export interface SupportMessageDto {
  id: string;
  shopId: string;
  shopName: string;
  senderId: string;
  senderName: string;
  subject: string;
  body: string;
  status: "open" | "answered";
  createdAt: string;
  reply?: { body: string; createdAt: string };
}

/**
 * BF-112 : le formulaire lui-même est réservé aux boutiques disposant du
 * privilège premium `contactForm` (voir `lib/premiumFeatures.ts`,
 * `setShopPremiumFeatureAction`) — revérifié ici, pas seulement masqué côté
 * UI, même raisonnement que le reste des Server Actions privilégiées du
 * projet. `shopId` n'est jamais fourni par l'appelant : dérivé de son
 * propre profil, pour ne jamais avoir à faire confiance à une valeur
 * cliente.
 */
export async function sendSupportMessageAction(
  idToken: string,
  subject: string,
  body: string
): Promise<{ id: string }> {
  const caller = await requireCaller(idToken);
  const db = getAdminDb();

  const userSnapshot = await db.collection(USERS_COLLECTION).doc(caller.uid).get();
  const userData = userSnapshot.data();
  const shopId = userData?.shopId as string | undefined;
  if (!userData || !["admin", "seller"].includes(userData.role) || !shopId) {
    throw new ForbiddenError();
  }

  const shopSnapshot = await db.collection(SHOPS_COLLECTION).doc(shopId).get();
  const shopData = shopSnapshot.data();
  const premiumFeatures = (shopData?.premiumFeatures as string[] | undefined) ?? [];
  if (!shopData || !premiumFeatures.includes("contactForm")) {
    throw new ForbiddenError(
      "Le formulaire de contact n'est pas activé pour votre boutique."
    );
  }

  const trimmedSubject = subject.trim();
  const trimmedBody = body.trim();
  if (!trimmedSubject || !trimmedBody) {
    throw new ValidationError("L'objet et le message sont requis.");
  }

  const ref = db.collection(SUPPORT_MESSAGES_COLLECTION).doc();
  await ref.set({
    shopId,
    shopName: shopData.name,
    senderId: caller.uid,
    senderName: userData.displayName ?? "Commerçant",
    subject: trimmedSubject,
    body: trimmedBody,
    status: "open",
    createdAt: FieldValue.serverTimestamp(),
  });
  return { id: ref.id };
}

/** BF-113 : tous les messages, toutes boutiques confondues — un Super
 * Admin, pas une boutique, donc pas exprimable par les règles Firestore
 * scopées par boutique (voir `firestore.rules`), même raisonnement que
 * `listMerchantsAction`. */
export async function listSupportMessagesAction(
  idToken: string
): Promise<SupportMessageDto[]> {
  await requireSuperAdmin(idToken);

  const snapshot = await getAdminDb()
    .collection(SUPPORT_MESSAGES_COLLECTION)
    .orderBy("createdAt", "desc")
    .get();

  return snapshot.docs.map((docSnapshot) => {
    const data = docSnapshot.data();
    return {
      id: docSnapshot.id,
      shopId: data.shopId,
      shopName: data.shopName,
      senderId: data.senderId,
      senderName: data.senderName,
      subject: data.subject,
      body: data.body,
      status: data.status,
      createdAt: data.createdAt.toDate().toISOString(),
      reply: data.reply
        ? {
            body: data.reply.body,
            createdAt: data.reply.createdAt.toDate().toISOString(),
          }
        : undefined,
    } satisfies SupportMessageDto;
  });
}

/** BF-114 : une seule réponse par message (pas de fil) — répondre marque le
 * message "answered", il n'y a pas de second tour. */
export async function answerSupportMessageAction(
  idToken: string,
  messageId: string,
  replyBody: string
): Promise<void> {
  await requireSuperAdmin(idToken);

  const trimmedReply = replyBody.trim();
  if (!trimmedReply) {
    throw new ValidationError("La réponse ne peut pas être vide.");
  }

  const ref = getAdminDb().collection(SUPPORT_MESSAGES_COLLECTION).doc(messageId);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    throw new NotFoundError();
  }

  await ref.update({
    status: "answered",
    reply: {
      body: trimmedReply,
      createdAt: FieldValue.serverTimestamp(),
    },
  });
}

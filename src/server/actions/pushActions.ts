"use server";

import { getAdminDb } from "@/lib/firebaseAdmin";
import { requireCaller } from "@/server/auth/requireCaller";
import { ValidationError } from "@/server/errors";
import { PUSH_TOKENS_COLLECTION, pushTokenId, savePushToken, sendPush } from "@/server/push/sendPush";

/** Un jeton FCM : une longue chaîne sans espace. */
function checkToken(token: unknown): string {
  if (typeof token !== "string" || token.length < 20 || token.length > 4096 || /\s/.test(token)) {
    throw new ValidationError("Appareil non reconnu.");
  }
  return token;
}

/**
 * Inscrit l'appareil de l'appelant aux notifications push (2026-10-04).
 * Un appareil n'appartient qu'à un compte : se connecter avec un autre
 * compte sur le même téléphone lui transfère les notifications.
 */
export async function registerPushTokenAction(idToken: string, token: string, userAgent: string): Promise<void> {
  const caller = await requireCaller(idToken);
  await savePushToken(getAdminDb(), caller.uid, checkToken(token), String(userAgent ?? ""));
}

/** Désinscrit l'appareil (seulement s'il appartient à l'appelant). */
export async function unregisterPushTokenAction(idToken: string, token: string): Promise<void> {
  const caller = await requireCaller(idToken);
  const ref = getAdminDb().collection(PUSH_TOKENS_COLLECTION).doc(pushTokenId(checkToken(token)));
  const snapshot = await ref.get();
  if (snapshot.exists && snapshot.data()?.userId === caller.uid) await ref.delete();
}

/** Notification d'essai sur tous les appareils de l'appelant. */
export async function sendTestPushAction(idToken: string): Promise<{ sent: number }> {
  const caller = await requireCaller(idToken);
  const sent = await sendPush(getAdminDb(), [caller.uid], {
    title: "Notifications activées",
    body: "Vous recevrez ici les nouvelles de ManuShop.",
    link: "/mon-compte",
    tag: "test",
  });
  return { sent };
}

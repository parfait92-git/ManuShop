import "server-only";

import { createHash } from "node:crypto";

import { FieldValue, type Firestore } from "firebase-admin/firestore";

import { getAdminMessaging } from "@/lib/firebaseAdmin";

/** Appareils inscrits aux notifications push : un document par appareil,
 * écrit uniquement par le serveur (`firestore.rules`). */
export const PUSH_TOKENS_COLLECTION = "pushTokens";

/** Identifiant d'un appareil : empreinte de son jeton FCM (un jeton est
 * long et change rarement ; l'empreinte évite les doublons). */
export function pushTokenId(token: string): string {
  return createHash("sha256").update(token).digest("hex").slice(0, 40);
}

export interface PushMessage {
  title: string;
  body: string;
  /** Page ouverte au toucher de la notification. */
  link: string;
  /** Regroupe les notifications d'un même sujet (une remplace l'autre). */
  tag?: string;
}

/** Erreurs FCM d'un appareil qui n'existe plus : son jeton est supprimé. */
const DEAD_TOKEN = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument",
]);

const chunks = <T,>(list: T[], size: number) =>
  Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, i * size + size));

/**
 * Envoie une notification push à tous les appareils des utilisateurs
 * donnés (2026-10-04). N'échoue jamais : une notification est un plus, elle
 * ne doit pas faire échouer la commande ou l'action qui la déclenche.
 * Message « données seulement » : le service worker (`public/sw.js`)
 * l'affiche lui-même, au même format sur tous les navigateurs.
 */
export async function sendPush(db: Firestore, userIds: string[], message: PushMessage): Promise<number> {
  const recipients = [...new Set(userIds.filter(Boolean))];
  if (recipients.length === 0) return 0;
  try {
    const messaging = await getAdminMessaging();
    if (!messaging) return 0;

    const tokens: { id: string; token: string }[] = [];
    for (const group of chunks(recipients, 30)) {
      const snapshot = await db.collection(PUSH_TOKENS_COLLECTION).where("userId", "in", group).get();
      snapshot.docs.forEach((d) => tokens.push({ id: d.id, token: String(d.data().token) }));
    }
    if (tokens.length === 0) return 0;

    let sent = 0;
    for (const group of chunks(tokens, 500)) {
      const response = await messaging.sendEachForMulticast({
        tokens: group.map((t) => t.token),
        data: { title: message.title, body: message.body, link: message.link, tag: message.tag ?? "" },
        webpush: { headers: { Urgency: "high", TTL: String(24 * 3600) } },
      });
      sent += response.successCount;
      const dead = response.responses.flatMap((r, i) => (!r.success && r.error && DEAD_TOKEN.has(r.error.code) ? [group[i].id] : []));
      await Promise.all(dead.map((id) => db.collection(PUSH_TOKENS_COLLECTION).doc(id).delete()));
    }
    return sent;
  } catch (error) {
    console.error("sendPush : notification non envoyée", error);
    return 0;
  }
}

/** Équipe d'une boutique : son propriétaire et les comptes rattachés
 * (gérant ou vendeur dont c'est la boutique active). */
export async function shopTeamIds(db: Firestore, shopId: string): Promise<string[]> {
  const [shop, members] = await Promise.all([
    db.collection("shops").doc(shopId).get(),
    db.collection("users").where("shopId", "==", shopId).get(),
  ]);
  return [
    ...new Set([
      ...(shop.data()?.ownerId ? [String(shop.data()!.ownerId)] : []),
      ...members.docs.filter((d) => ["admin", "seller"].includes(d.data().role)).map((d) => d.id),
    ]),
  ];
}

/** Comptes Super Admin (adresses de `platformAdmins`). */
export async function superAdminIds(db: Firestore): Promise<string[]> {
  const admins = await db.collection("platformAdmins").get();
  const emails = admins.docs.map((d) => d.id);
  const ids: string[] = [];
  for (const group of chunks(emails, 30)) {
    const users = await db.collection("users").where("email", "in", group).get();
    ids.push(...users.docs.map((d) => d.id));
  }
  return ids;
}

/** Enregistre (ou rafraîchit) l'appareil d'un utilisateur. */
export async function savePushToken(db: Firestore, userId: string, token: string, userAgent: string): Promise<void> {
  await db
    .collection(PUSH_TOKENS_COLLECTION)
    .doc(pushTokenId(token))
    .set(
      { userId, token, userAgent: userAgent.slice(0, 300), updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
}

"use server";

import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebaseAdmin";
import { computeSubscriptionExpiry } from "@/lib/subscriptionPlans";
import type { SubscriptionPlan } from "@/models/shop/Shop";
import { requireCaller } from "@/server/auth/requireCaller";

const SHOPS_COLLECTION = "shops";
const USERS_COLLECTION = "users";

// Nommé "Action" (pas juste `CreateShopInput`) pour ne pas entrer en
// collision avec `CreateShopInput` de `lib/validation/auth.ts` (le schéma
// à un seul champ de `CreateShopPrompt.tsx`, un flux totalement distinct).
export interface CreateShopActionInput {
  name: string;
  sector?: string;
  address?: string;
  phone?: string;
  whatsapp?: string;
  logo?: string;
  subscriptionPlan: SubscriptionPlan;
}

/**
 * BF-79→85 : n'importe quel compte connecté peut créer une boutique — donc
 * `requireCaller` seul (juste l'identité), aucune vérification de privilège
 * au-delà, à la différence de `requireSuperAdmin`. C'est justement cette
 * action qui *accorde* le privilège admin, pas une action qui le suppose déjà.
 */
export async function createShopAction(
  idToken: string,
  input: CreateShopActionInput
): Promise<{ shopId: string }> {
  const caller = await requireCaller(idToken);
  const db = getAdminDb();

  const shopRef = db.collection(SHOPS_COLLECTION).doc();
  await shopRef.set({
    name: input.name,
    sector: input.sector ?? "",
    logo: input.logo ?? "",
    address: input.address ?? "",
    phone: input.phone ?? "",
    whatsapp: input.whatsapp ?? "",
    currency: "XAF",
    ownerId: caller.uid,
    adminSource: "subscription",
    subscriptionPlan: input.subscriptionPlan,
    subscriptionExpiresAt: Timestamp.fromDate(
      computeSubscriptionExpiry(input.subscriptionPlan, new Date())
    ),
    createdAt: FieldValue.serverTimestamp(),
  });

  const userRef = db.collection(USERS_COLLECTION).doc(caller.uid);
  const userSnapshot = await userRef.get();
  const wasAlreadyAdmin = userSnapshot.data()?.role === "admin";

  await userRef.update({
    shopId: shopRef.id,
    ...(wasAlreadyAdmin
      ? {}
      : { role: "admin", adminSource: "subscription" }),
  });

  return { shopId: shopRef.id };
}

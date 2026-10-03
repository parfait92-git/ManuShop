import "server-only";

import type { Firestore } from "firebase-admin/firestore";

import { resolvePremiumCatalog, type PremiumCatalog } from "@/lib/premiumCatalog";

export const PREMIUM_CONFIG_DOC = "premium";

/** Offres premium en vigueur (`configuration/premium`), complétées des
 * valeurs par défaut. */
export async function readPremiumCatalog(db: Firestore): Promise<PremiumCatalog> {
  const snapshot = await db.collection("configuration").doc(PREMIUM_CONFIG_DOC).get();
  return resolvePremiumCatalog(snapshot.data());
}

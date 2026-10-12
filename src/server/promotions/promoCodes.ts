import "server-only";

import type { Firestore } from "firebase-admin/firestore";

export const PROMO_CODES_COLLECTION = "promoCodes";
/** Sous-collection : utilisations de chaque client (`uses/<clientId>`). */
export const PROMO_CODE_USES = "uses";

/** Un code est unique dans sa boutique : il fait partie de l'identifiant. */
export function promoCodeRef(db: Firestore, shopId: string, code: string) {
  return db.collection(PROMO_CODES_COLLECTION).doc(`${shopId}_${code}`);
}

import "server-only";

import type { Firestore } from "firebase-admin/firestore";

import type { CampaignFields } from "@/lib/pricing";

export const PROMOTIONS_COLLECTION = "promotions";

/** Campagnes d'une boutique (SDK Admin), pour calculer les prix au moment
 * de la commande, comme la vitrine. */
export async function readShopCampaigns(db: Firestore, shopId: string): Promise<CampaignFields[]> {
  const snapshot = await db.collection(PROMOTIONS_COLLECTION).where("shopId", "==", shopId).get();
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as CampaignFields);
}

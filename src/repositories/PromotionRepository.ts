import { collection, getDocs, onSnapshot, query, where } from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { Promotion } from "@/models/promotion/Promotion";

const PROMOTIONS_COLLECTION = "promotions";

/** Lecture des campagnes d'une boutique (écrites par le serveur). Filtre
 * d'égalité seul : aucun index composite à créer. */
export class PromotionRepository {
  async listByShop(shopId: string): Promise<Promotion[]> {
    const snapshot = await getDocs(query(collection(db, PROMOTIONS_COLLECTION), where("shopId", "==", shopId)));
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Promotion);
  }

  watchByShop(shopId: string, onChange: (promotions: Promotion[]) => void, onError?: () => void): () => void {
    return onSnapshot(
      query(collection(db, PROMOTIONS_COLLECTION), where("shopId", "==", shopId)),
      (snapshot) => onChange(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Promotion)),
      () => onError?.()
    );
  }
}

export const promotionRepository = new PromotionRepository();

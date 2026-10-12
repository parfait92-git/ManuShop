import { collection, onSnapshot, query, where } from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { PromoCode } from "@/models/promotion/PromoCode";

const PROMO_CODES_COLLECTION = "promoCodes";

/** Codes promo d'une boutique, lus par son gérant (écrits par le serveur). */
export class PromoCodeRepository {
  watchByShop(shopId: string, onChange: (codes: PromoCode[]) => void, onError?: () => void): () => void {
    return onSnapshot(
      query(collection(db, PROMO_CODES_COLLECTION), where("shopId", "==", shopId)),
      (snapshot) => onChange(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as PromoCode)),
      () => onError?.()
    );
  }
}

export const promoCodeRepository = new PromoCodeRepository();

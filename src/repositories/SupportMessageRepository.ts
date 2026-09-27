import { collection, getDocs, query, where } from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { SupportMessage } from "@/models/support/SupportMessage";
import type { ISupportMessageRepository } from "@/repositories/interfaces/ISupportMessageRepository";

const SUPPORT_MESSAGES_COLLECTION = "supportMessages";

export class SupportMessageRepository implements ISupportMessageRepository {
  // Pas de `orderBy` : évite un index composite (égalité + tri sur un autre
  // champ) — même convention que `OrderRepository.listByShop`, tri fait par
  // l'appelant.
  async listForShop(shopId: string): Promise<SupportMessage[]> {
    const snapshot = await getDocs(
      query(
        collection(db, SUPPORT_MESSAGES_COLLECTION),
        where("shopId", "==", shopId)
      )
    );
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as SupportMessage);
  }
}

export const supportMessageRepository = new SupportMessageRepository();

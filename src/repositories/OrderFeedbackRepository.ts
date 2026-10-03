import { collection, getDocs, query, where } from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { OrderFeedback } from "@/models/review/OrderFeedback";
import type { IOrderFeedbackRepository } from "@/repositories/interfaces/IOrderFeedbackRepository";

const FEEDBACK_COLLECTION = "orderFeedback";

export class OrderFeedbackRepository implements IOrderFeedbackRepository {
  // Requête plutôt que `getDoc(orderId)` : un document absent (avis pas
  // encore donné) serait refusé par `firestore.rules`, qui lit
  // `resource.data.clientId` ; filtrée sur `clientId`, la requête est
  // acceptée et revient simplement vide.
  async getForClient(orderId: string, clientId: string): Promise<OrderFeedback | null> {
    const snapshot = await getDocs(
      query(
        collection(db, FEEDBACK_COLLECTION),
        where("orderId", "==", orderId),
        where("clientId", "==", clientId)
      )
    );
    return (snapshot.docs[0]?.data() as OrderFeedback | undefined) ?? null;
  }

  async listByShop(shopId: string): Promise<OrderFeedback[]> {
    const snapshot = await getDocs(
      query(collection(db, FEEDBACK_COLLECTION), where("shopId", "==", shopId))
    );
    return snapshot.docs.map((d) => d.data() as OrderFeedback);
  }
}

export const orderFeedbackRepository = new OrderFeedbackRepository();

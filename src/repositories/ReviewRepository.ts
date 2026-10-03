import { collection, getDocs, query, where } from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { Review } from "@/models/review/Review";
import type { IReviewRepository } from "@/repositories/interfaces/IReviewRepository";

const REVIEWS_COLLECTION = "reviews";

export class ReviewRepository implements IReviewRepository {
  listByProduct(productId: string): Promise<Review[]> {
    return this.listWhere("productId", productId);
  }

  listByOrder(orderId: string): Promise<Review[]> {
    return this.listWhere("orderId", orderId);
  }

  listByShop(shopId: string): Promise<Review[]> {
    return this.listWhere("shopId", shopId);
  }

  // Une seule égalité, pas de `orderBy` : aucun index composite (tri fait
  // par l'appelant, même convention que `SupportMessageRepository`).
  private async listWhere(field: string, value: string): Promise<Review[]> {
    const snapshot = await getDocs(
      query(collection(db, REVIEWS_COLLECTION), where(field, "==", value))
    );
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Review);
  }
}

export const reviewRepository = new ReviewRepository();

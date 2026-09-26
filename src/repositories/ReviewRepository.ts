import { collection, getDocs, query, where } from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { Review } from "@/models/review/Review";
import type { IReviewRepository } from "@/repositories/interfaces/IReviewRepository";

const REVIEWS_COLLECTION = "reviews";

export class ReviewRepository implements IReviewRepository {
  async listByProduct(productId: string): Promise<Review[]> {
    const snapshot = await getDocs(
      query(
        collection(db, REVIEWS_COLLECTION),
        where("productId", "==", productId)
      )
    );
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Review);
  }
}

export const reviewRepository = new ReviewRepository();

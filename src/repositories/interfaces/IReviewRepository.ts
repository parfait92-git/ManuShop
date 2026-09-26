import type { Review } from "@/models/review/Review";

export interface IReviewRepository {
  listByProduct(productId: string): Promise<Review[]>;
}

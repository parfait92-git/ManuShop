import type { Review } from "@/models/review/Review";
import { reviewRepository } from "@/repositories/ReviewRepository";
import type { IReviewRepository } from "@/repositories/interfaces/IReviewRepository";

export class ReviewService {
  constructor(private readonly reviews: IReviewRepository = reviewRepository) {}

  listByProduct(productId: string): Promise<Review[]> {
    return this.reviews.listByProduct(productId);
  }

  /** `null` plutôt qu'une note fictive quand il n'y a aucun avis — voir
   * `ProductService.getBadge()` pour le même principe. */
  getAverageRating(reviews: Review[]): number | null {
    const rated = reviews.filter((review) => typeof review.rating === "number");
    if (rated.length === 0) return null;

    const total = rated.reduce((sum, review) => sum + (review.rating ?? 0), 0);
    return total / rated.length;
  }
}

export const reviewService = new ReviewService();

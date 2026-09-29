import { auth } from "@/lib/firebase";
import type { Review } from "@/models/review/Review";
import { reviewRepository } from "@/repositories/ReviewRepository";
import type { IReviewRepository } from "@/repositories/interfaces/IReviewRepository";
import {
  submitReviewAction,
  type SubmitReviewActionInput,
} from "@/server/actions/reviewActions";

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

  /** BF-76 : passe par la Server Action pour revalider que la commande
   * appartient bien à l'appelant et qu'elle est réellement livrée (voir
   * `reviewActions.ts`) — même raisonnement que `OrderService.cancelOrder`. */
  async submitReview(
    input: SubmitReviewActionInput
  ): Promise<{ reviewId: string }> {
    return submitReviewAction(await this.getCallerIdToken(), input);
  }

  private async getCallerIdToken(): Promise<string> {
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      throw new Error("Vous devez être connecté.");
    }
    return token;
  }
}

export const reviewService = new ReviewService();

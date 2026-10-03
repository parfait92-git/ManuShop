import type { Review } from "@/models/review/Review";

export interface IReviewRepository {
  listByProduct(productId: string): Promise<Review[]>;
  /** Avis d'une commande (écran d'avis du client). */
  listByOrder(orderId: string): Promise<Review[]>;
  /** Avis des articles d'une boutique (écran « Avis clients » du commerçant). */
  listByShop(shopId: string): Promise<Review[]>;
}

import type { OrderFeedback } from "@/models/review/OrderFeedback";

/** Lecture seule — l'avis et la réponse passent par des Server Actions
 * (`feedbackActions.ts`), jamais par ce repository. */
export interface IOrderFeedbackRepository {
  /** Avis de livraison d'une commande, lu par son client (`null` s'il n'en
   * a pas encore donné). */
  getForClient(orderId: string, clientId: string): Promise<OrderFeedback | null>;
  listByShop(shopId: string): Promise<OrderFeedback[]>;
}

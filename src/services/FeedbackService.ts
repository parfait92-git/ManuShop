import { auth } from "@/lib/firebase";
import type { OrderFeedback } from "@/models/review/OrderFeedback";
import type { Review } from "@/models/review/Review";
import { orderFeedbackRepository } from "@/repositories/OrderFeedbackRepository";
import { reviewRepository } from "@/repositories/ReviewRepository";
import type { IOrderFeedbackRepository } from "@/repositories/interfaces/IOrderFeedbackRepository";
import type { IReviewRepository } from "@/repositories/interfaces/IReviewRepository";
import {
  replyToFeedbackAction,
  submitDeliveryFeedbackAction,
  type ReplyToFeedbackInput,
  type SubmitDeliveryFeedbackInput,
} from "@/server/actions/feedbackActions";

/** Avis d'une commande livrée : la livraison (privé) et ses articles. */
export interface OrderFeedbackBundle {
  delivery: OrderFeedback | null;
  reviews: Review[];
}

/** Avis reçus par une boutique, regroupés par commande (écran « Avis
 * clients »), la plus récente d'abord. */
export interface ShopOrderFeedback {
  orderId: string;
  clientName: string;
  /** Date du dernier avis de la commande, en millisecondes. */
  latestAt: number;
  delivery: OrderFeedback | null;
  reviews: Review[];
}

const toMillis = (value: { toMillis?: () => number } | undefined) =>
  value?.toMillis?.() ?? 0;

/** Un avis sans réponse — sert au filtre et au badge du commerçant. */
export function countUnreplied(group: ShopOrderFeedback): number {
  return (
    (group.delivery && !group.delivery.reply ? 1 : 0) +
    group.reviews.filter((review) => !review.reply).length
  );
}

/**
 * Avis de livraison et réponses du commerçant (2026-10-02). Les écritures
 * passent par les Server Actions (`feedbackActions.ts`), qui revérifient
 * le client, la commande livrée et l'équipe de la boutique.
 */
export class FeedbackService {
  constructor(
    private readonly feedback: IOrderFeedbackRepository = orderFeedbackRepository,
    private readonly reviews: IReviewRepository = reviewRepository
  ) {}

  async getForOrder(orderId: string, clientId: string): Promise<OrderFeedbackBundle> {
    const [delivery, reviews] = await Promise.all([
      this.feedback.getForClient(orderId, clientId),
      this.reviews.listByOrder(orderId),
    ]);
    return { delivery, reviews };
  }

  async listForShop(shopId: string): Promise<ShopOrderFeedback[]> {
    const [deliveries, reviews] = await Promise.all([
      this.feedback.listByShop(shopId),
      this.reviews.listByShop(shopId),
    ]);
    const groups = new Map<string, ShopOrderFeedback>();
    const groupFor = (orderId: string, clientName: string) => {
      let group = groups.get(orderId);
      if (!group) {
        group = { orderId, clientName, latestAt: 0, delivery: null, reviews: [] };
        groups.set(orderId, group);
      }
      if (!group.clientName) group.clientName = clientName;
      return group;
    };
    for (const delivery of deliveries) {
      const group = groupFor(delivery.orderId, delivery.clientName);
      group.delivery = delivery;
      group.latestAt = Math.max(group.latestAt, toMillis(delivery.createdAt));
    }
    for (const review of reviews) {
      const group = groupFor(review.orderId, "");
      group.reviews.push(review);
      group.latestAt = Math.max(group.latestAt, toMillis(review.createdAt));
    }
    return [...groups.values()].sort((a, b) => b.latestAt - a.latestAt);
  }

  async submitDeliveryFeedback(input: SubmitDeliveryFeedbackInput): Promise<void> {
    return submitDeliveryFeedbackAction(await this.getCallerIdToken(), input);
  }

  async reply(input: ReplyToFeedbackInput): Promise<void> {
    return replyToFeedbackAction(await this.getCallerIdToken(), input);
  }

  private async getCallerIdToken(): Promise<string> {
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      throw new Error("Vous devez être connecté.");
    }
    return token;
  }
}

export const feedbackService = new FeedbackService();

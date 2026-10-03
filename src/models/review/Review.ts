import type { Timestamp } from "firebase/firestore";

import type { ReviewReply } from "./OrderFeedback";

/**
 * Avis client sur un produit (Module 13/14, BF-72/76). Écriture via
 * `reviewService.submitReview()` → `submitReviewAction` (Server Action,
 * `firebase-admin`) uniquement — `firestore.rules` verrouille `reviews` en
 * écriture directe, la commande doit être revérifiée comme livrée et
 * appartenant à l'appelant avant d'écrire quoi que ce soit.
 */
export interface Review {
  id: string;
  productId: string;
  shopId: string;
  orderId: string;
  authorId: string;
  rating?: number;
  comment: string;
  // Motif transmis au vendeur quand le client signale une commande
  // défectueuse plutôt qu'un avis ordinaire (BF-76).
  reason?: "defective" | "other";
  /** Réponse du commerçant — **publique** (choix de l'utilisateur),
   * affichée sous l'avis sur la fiche produit (« Réponse du vendeur »). */
  reply?: ReviewReply;
  createdAt: Timestamp;
}

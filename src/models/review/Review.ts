import type { Timestamp } from "firebase/firestore";

/**
 * Avis client sur un produit (Module 13/14, BF-72/76). `orderId`/`authorId`
 * et l'écriture elle-même sont posés par BF-76 (avis après livraison, pas
 * encore construit — nécessite une vraie commande livrée) ; cette tranche
 * ne fait que lire, pour afficher les avis existants sur la fiche produit.
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
  createdAt: Timestamp;
}

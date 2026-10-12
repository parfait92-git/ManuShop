import type { Timestamp } from "firebase/firestore";

/**
 * Campagne de promotion d'une boutique (BF-30→33, 2026-10-12) : une
 * réduction automatique, sans code, sur toute la boutique, des catégories
 * ou des produits choisis, entre deux dates. Écrite par le serveur
 * seulement ; lisible par tous (le prix affiché en dépend).
 */
export type PromotionKind = "percent" | "amount";

export type PromotionTarget =
  | { type: "shop" }
  | { type: "categories"; categories: string[] }
  | { type: "products"; productIds: string[] };

export interface Promotion {
  id: string;
  shopId: string;
  title: string;
  /** Pourcentage (1 à 90) ou montant en FCFA retiré du prix. */
  kind: PromotionKind;
  value: number;
  target: PromotionTarget;
  startsAt: Timestamp;
  endsAt: Timestamp;
  /** Promotion flash : compte à rebours sur la boutique et les fiches. */
  flash: boolean;
  createdAt: Timestamp;
}

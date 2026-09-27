import type { Timestamp } from "firebase/firestore";

/**
 * Taxonomie système (BF-109→111) : liste de tags colorés créée et gérée
 * exclusivement par le Super Admin — un commerçant choisit un tag existant
 * en créant une catégorie (`Category.tagId`) plutôt que d'en inventer un,
 * pour garantir une classification cohérente entre boutiques malgré des
 * noms de catégorie différents d'une boutique à l'autre.
 */
export interface CategoryTag {
  id: string;
  name: string;
  /** Couleur hex (ex. "#2563eb") — affichage seulement, aucune contrainte
   * de palette. */
  color: string;
  createdAt: Timestamp;
}

import type { Timestamp } from "firebase/firestore";

export interface Category {
  id: string;
  shopId: string;
  name: string;
  // Optionnels pour la lecture : les catégories créées avant l'ajout de ces
  // champs n'en disposent pas encore dans Firestore.
  description?: string;
  isActive?: boolean;
  /** BF-109→111 : référence à `CategoryTag.id`, la taxonomie système gérée
   * par le Super Admin — absent tant que le commerçant n'en a pas choisi un
   * (facultatif, ne bloque jamais la création d'une catégorie). */
  tagId?: string;
  // Corbeille générique (BF-99/100, 04-besoins-techniques.md §12.4).
  deletedAt?: Timestamp;
  createdAt: Timestamp;
}

import type { Timestamp } from "firebase/firestore";

/** BF-98, 04-besoins-techniques.md §12.8. Une entrée par opération
 * commerçant pertinente (produit, catégorie, paramètres...). Pas
 * d'événement de commande pour l'instant — le Module 4 (Commandes) n'existe
 * pas encore, aucune commande n'est jamais écrite en base. */
export type ActivityLogAction =
  | "product.published"
  | "product.unpublished"
  | "product.trashed"
  | "product.restored"
  | "category.trashed"
  | "category.restored"
  | "shop.settings_updated";

export interface ActivityLogEntry {
  id: string;
  shopId: string;
  actorId: string;
  // Dénormalisé à l'écriture (pas dans la spec initiale de
  // 04-besoins-techniques.md §12.8) : évite un aller-retour Firestore par
  // ligne affichée — `profile.displayName` est déjà connu côté client au
  // moment de l'écriture.
  actorName: string;
  action: ActivityLogAction;
  targetType: "product" | "category" | "shop";
  targetId: string;
  metadata?: Record<string, unknown>;
  createdAt: Timestamp;
}

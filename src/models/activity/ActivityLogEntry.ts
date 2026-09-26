import type { Timestamp } from "firebase/firestore";

/** BF-98, 04-besoins-techniques.md §12.8. Une entrée par opération
 * commerçant pertinente (produit, catégorie, paramètres, commande...).
 * Événements `order.*` posés uniquement pour les actions commerçant (statut
 * changé, annulation, retour) — jamais pour la création d'une commande par
 * un client (`role: 'client'` n'a pas le droit d'écrire dans ce journal,
 * voir `firestore.rules`), qui reste visible via la cloche du tableau de
 * bord (`useNewOrdersCount`) à la place. */
export type ActivityLogAction =
  | "product.published"
  | "product.unpublished"
  | "product.trashed"
  | "product.restored"
  | "category.trashed"
  | "category.restored"
  | "shop.settings_updated"
  | "order.created"
  | "order.status_changed"
  | "order.cancelled"
  | "order.returned";

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
  targetType: "product" | "category" | "shop" | "order";
  targetId: string;
  metadata?: Record<string, unknown>;
  createdAt: Timestamp;
}

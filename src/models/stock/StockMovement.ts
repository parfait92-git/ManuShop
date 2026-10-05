import type { Timestamp } from "firebase/firestore";

/**
 * Mouvement de stock (BF-15, 2026-10-03) : chaque entrée ou sortie d'un
 * produit, écrite par le serveur seulement (`stockMovements`, voir
 * firestore.rules), en même temps que le stock lui-même.
 *
 * - `initial` : stock saisi à la création du produit ;
 * - `order` : sortie à la commande ;
 * - `cancelled`, `returned`, `defective` : remise en stock d'une commande ;
 * - `restock` : réapprovisionnement saisi par l'équipe (BF-16) ;
 * - `adjustment` : correction d'inventaire, stock remis au chiffre compté.
 */
export type StockMovementType =
  | "initial"
  | "order"
  | "cancelled"
  | "returned"
  | "defective"
  | "restock"
  | "adjustment";

export interface StockMovement {
  id: string;
  shopId: string;
  productId: string;
  /** Nom du produit au moment du mouvement (le produit peut être renommé
   * ou supprimé ensuite). */
  productName: string;
  /** Version concernée (BF-17) ; `productName` la mentionne déjà. */
  variantId?: string;
  variantLabel?: string;
  type: StockMovementType;
  /** Variation : positive pour une entrée, négative pour une sortie. */
  quantity: number;
  /** Stock juste après le mouvement (celui de la version, s'il y en a une). */
  stockAfter: number;
  orderId?: string;
  /** Fournisseur, motif de la correction… */
  note?: string;
  /** Membre de l'équipe ; absent pour une commande passée par un client. */
  actorId?: string;
  actorName?: string;
  createdAt: Timestamp;
}

export const STOCK_MOVEMENT_LABEL: Record<StockMovementType, string> = {
  initial: "Stock initial",
  order: "Commande",
  cancelled: "Commande annulée",
  returned: "Retour",
  defective: "Retour (défectueux)",
  restock: "Réapprovisionnement",
  adjustment: "Correction d'inventaire",
};

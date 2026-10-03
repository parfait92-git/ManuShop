import type { Timestamp } from "firebase/firestore";

export interface OrderCostItem {
  productId: string;
  /** Prix d'achat unitaire au moment de la vente. Absent quand le produit
   * n'avait pas encore de prix d'achat : le gain est alors estimé avec le
   * prix d'achat actuel (voir `profitReport`). */
  unitCost?: number;
}

/**
 * Coûts figés d'une commande — document `orderCosts/{orderId}`, écrit par
 * le serveur à la création de la commande (`createOrderAction`). À part de
 * la commande elle-même, que le client qui l'a passée peut lire : il y
 * verrait sinon la marge du commerçant. Lisible par le seul gérant.
 */
export interface OrderCost {
  /** Même id que la commande. */
  orderId: string;
  shopId: string;
  items: OrderCostItem[];
  createdAt?: Timestamp;
}

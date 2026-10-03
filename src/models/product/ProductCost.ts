import type { Timestamp } from "firebase/firestore";

/**
 * Prix d'achat d'un produit — document `productCosts/{productId}`, à part du
 * produit : `products` est lisible par tout le monde (vitrine publique), un
 * prix d'achat y serait visible de n'importe quel visiteur ou concurrent.
 * Lisible et modifiable par le seul gérant de la boutique (firestore.rules).
 */
export interface ProductCost {
  /** Même id que le produit. */
  productId: string;
  shopId: string;
  purchasePrice: number;
  updatedAt?: Timestamp;
}

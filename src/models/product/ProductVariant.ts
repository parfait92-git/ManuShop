/**
 * Version d'un produit (BF-17, 2026-10-04) : « 250 ml », « Taille M »…
 * Rangées dans `Product.variants`, une table indexée par identifiant
 * plutôt qu'une liste : le serveur peut ainsi incrémenter le stock d'une
 * version (`variants.<id>.stock`) sans relire le produit, comme il le fait
 * pour `Product.stock` — deux commandes simultanées ne s'écrasent pas.
 */
export interface ProductVariant {
  label: string;
  stock: number;
  /** Prix propre à cette version (FCFA) ; absent : prix du produit
   * (promotion comprise). */
  price?: number;
  /** Ordre d'affichage. */
  position: number;
}

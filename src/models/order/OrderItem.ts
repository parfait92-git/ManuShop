export interface OrderItem {
  productId: string;
  /** Nom affiché, version comprise (« Huile de coco — 500 ml ») : factures,
   * rapports et messages le reprennent tel quel. */
  name: string;
  quantity: number;
  unitPrice: number;
  /** Version commandée (BF-17), pour remettre en stock la bonne. */
  variantId?: string;
  variantLabel?: string;
}

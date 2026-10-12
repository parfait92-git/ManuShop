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
  /** Campagne de promotion appliquée (bilan des promotions). */
  promotionId?: string;
  /** Prix sans la campagne (promotion du produit comprise) : la réduction
   * accordée par la campagne, pour son bilan (BF-34). */
  priceBeforeCampaign?: number;
}

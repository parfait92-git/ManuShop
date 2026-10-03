import type { OrderCost } from "@/models/order/OrderCost";
import type { ProductCost } from "@/models/product/ProductCost";
import type { IOrderCostRepository } from "@/repositories/interfaces/IOrderCostRepository";
import type { IProductCostRepository } from "@/repositories/interfaces/IProductCostRepository";
import { orderCostRepository } from "@/repositories/OrderCostRepository";
import { productCostRepository } from "@/repositories/ProductCostRepository";

/**
 * Prix d'achat des produits et coûts figés des commandes — réservés au
 * gérant (voir `ProductCost`/`OrderCost` et firestore.rules).
 */
export class CostService {
  constructor(
    private readonly productCosts: IProductCostRepository = productCostRepository,
    private readonly orderCosts: IOrderCostRepository = orderCostRepository
  ) {}

  async getPurchasePrice(productId: string): Promise<number | undefined> {
    return (await this.productCosts.get(productId))?.purchasePrice;
  }

  /** Enregistre le prix d'achat, ou le retire si le champ a été vidé. */
  savePurchasePrice(
    productId: string,
    shopId: string,
    purchasePrice: number | undefined
  ): Promise<void> {
    return purchasePrice === undefined
      ? this.productCosts.remove(productId)
      : this.productCosts.set(productId, shopId, purchasePrice);
  }

  listProductCosts(shopId: string): Promise<ProductCost[]> {
    return this.productCosts.listByShop(shopId);
  }

  listOrderCosts(shopId: string): Promise<OrderCost[]> {
    return this.orderCosts.listByShop(shopId);
  }
}

export const costService = new CostService();

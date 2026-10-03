import type { ProductCost } from "@/models/product/ProductCost";

export interface IProductCostRepository {
  get(productId: string): Promise<ProductCost | null>;
  listByShop(shopId: string): Promise<ProductCost[]>;
  set(productId: string, shopId: string, purchasePrice: number): Promise<void>;
  remove(productId: string): Promise<void>;
}

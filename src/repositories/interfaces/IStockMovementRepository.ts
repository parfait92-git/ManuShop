import type { StockMovement } from "@/models/stock/StockMovement";

export interface IStockMovementRepository {
  listByProduct(shopId: string, productId: string): Promise<StockMovement[]>;
  listByShop(shopId: string): Promise<StockMovement[]>;
}

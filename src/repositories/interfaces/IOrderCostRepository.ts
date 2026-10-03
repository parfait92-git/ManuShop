import type { OrderCost } from "@/models/order/OrderCost";

export interface IOrderCostRepository {
  listByShop(shopId: string): Promise<OrderCost[]>;
}

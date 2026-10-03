import { collection, getDocs, query, where } from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { OrderCost } from "@/models/order/OrderCost";
import type { IOrderCostRepository } from "@/repositories/interfaces/IOrderCostRepository";

const ORDER_COSTS_COLLECTION = "orderCosts";

export class OrderCostRepository implements IOrderCostRepository {
  async listByShop(shopId: string): Promise<OrderCost[]> {
    const snapshot = await getDocs(
      query(collection(db, ORDER_COSTS_COLLECTION), where("shopId", "==", shopId))
    );
    return snapshot.docs.map((d) => ({ orderId: d.id, ...d.data() }) as OrderCost);
  }
}

export const orderCostRepository = new OrderCostRepository();

import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { Order } from "@/models/order/Order";
import type { IOrderRepository } from "@/repositories/interfaces/IOrderRepository";

const ORDERS_COLLECTION = "orders";

export class OrderRepository implements IOrderRepository {
  async getById(id: string): Promise<Order | null> {
    const snapshot = await getDoc(doc(db, ORDERS_COLLECTION, id));
    if (!snapshot.exists()) return null;
    return { id: snapshot.id, ...snapshot.data() } as Order;
  }

  async listByShop(shopId: string): Promise<Order[]> {
    const snapshot = await getDocs(
      query(collection(db, ORDERS_COLLECTION), where("shopId", "==", shopId))
    );
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Order);
  }

  async listByClient(clientId: string): Promise<Order[]> {
    const snapshot = await getDocs(
      query(collection(db, ORDERS_COLLECTION), where("clientId", "==", clientId))
    );
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Order);
  }
}

export const orderRepository = new OrderRepository();

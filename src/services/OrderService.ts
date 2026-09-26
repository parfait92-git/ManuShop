import { auth } from "@/lib/firebase";
import type { Order } from "@/models/order/Order";
import type { OrderStatus } from "@/models/order/OrderStatus";
import { orderRepository } from "@/repositories/OrderRepository";
import type { IOrderRepository } from "@/repositories/interfaces/IOrderRepository";
import {
  createOrderAction,
  updateOrderStatusAction,
  type CreateOrderActionInput,
} from "@/server/actions/orderActions";

export class OrderService {
  constructor(private readonly orders: IOrderRepository = orderRepository) {}

  getOrder(id: string): Promise<Order | null> {
    return this.orders.getById(id);
  }

  /** Commandes de la boutique (commerçant, BF-22 historique). Aucun filtrage
   * ici — le tri/filtrage par statut se fait côté composant, comme
   * `ProductService.search`. */
  listByShop(shopId: string): Promise<Order[]> {
    return this.orders.listByShop(shopId);
  }

  /** Commandes du client connecté (BF-75, suivi de commande). */
  listByClient(clientId: string): Promise<Order[]> {
    return this.orders.listByClient(clientId);
  }

  /** BF-19 (commande client) et BF-21 (commande manuelle, `input.manual`) —
   * passe par la Server Action pour que la création de la commande et le
   * décrément de stock restent atomiques (voir `orderActions.ts`). */
  async createOrder(input: CreateOrderActionInput): Promise<{ orderId: string }> {
    return createOrderAction(await this.getCallerIdToken(), input);
  }

  /** Progression normale (commerçant) : "Prêt pour la livraison",
   * "Livraison en cours", "Livré" — aucun motif requis. */
  async advanceStatus(
    orderId: string,
    status: Extract<OrderStatus, "ready_for_delivery" | "delivering" | "delivered">
  ): Promise<void> {
    await updateOrderStatusAction(await this.getCallerIdToken(), orderId, { status });
  }

  /** BF-23 : client ou commerçant, uniquement avant expédition, motif requis
   * — revalidé côté serveur (voir `orderActions.ts`). */
  async cancelOrder(orderId: string, reason: string): Promise<void> {
    await updateOrderStatusAction(await this.getCallerIdToken(), orderId, {
      status: "cancelled",
      reason,
    });
  }

  /** BF-96/97 : commerçant uniquement, uniquement depuis "Livré", motif
   * requis — réincrémente le stock des articles. */
  async markReturned(
    orderId: string,
    outcome: Extract<OrderStatus, "returned" | "defective">,
    reason: string
  ): Promise<void> {
    await updateOrderStatusAction(await this.getCallerIdToken(), orderId, {
      status: outcome,
      reason,
    });
  }

  private async getCallerIdToken(): Promise<string> {
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      throw new Error("Vous devez être connecté.");
    }
    return token;
  }
}

export const orderService = new OrderService();

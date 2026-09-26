jest.mock("../lib/firebase", () => ({
  auth: { currentUser: { getIdToken: jest.fn().mockResolvedValue("token-1") } },
}));

const createOrderAction = jest.fn();
const updateOrderStatusAction = jest.fn();
jest.mock("../server/actions/orderActions", () => ({
  createOrderAction: (...args: unknown[]) => createOrderAction(...args),
  updateOrderStatusAction: (...args: unknown[]) => updateOrderStatusAction(...args),
}));

import { OrderService } from "@/services/OrderService";
import type { IOrderRepository } from "@/repositories/interfaces/IOrderRepository";
import type { Order } from "@/models/order/Order";

describe("OrderService", () => {
  let orders: jest.Mocked<IOrderRepository>;
  let service: OrderService;

  beforeEach(() => {
    jest.clearAllMocks();
    orders = { getById: jest.fn(), listByShop: jest.fn(), listByClient: jest.fn() };
    service = new OrderService(orders);
  });

  it("getOrder delegates to the repository", async () => {
    const order = { id: "o1" } as Order;
    orders.getById.mockResolvedValue(order);
    expect(await service.getOrder("o1")).toBe(order);
    expect(orders.getById).toHaveBeenCalledWith("o1");
  });

  it("listByShop delegates to the repository", async () => {
    orders.listByShop.mockResolvedValue([]);
    await service.listByShop("shop-1");
    expect(orders.listByShop).toHaveBeenCalledWith("shop-1");
  });

  it("listByClient delegates to the repository", async () => {
    orders.listByClient.mockResolvedValue([]);
    await service.listByClient("client-1");
    expect(orders.listByClient).toHaveBeenCalledWith("client-1");
  });

  it("createOrder delegates to the server action with the caller's ID token", async () => {
    createOrderAction.mockResolvedValue({ orderId: "o1" });
    const input = {
      shopId: "shop-1",
      clientName: "Fatou",
      clientPhone: "+237600000000",
      clientAddress: "Douala",
      items: [],
      subtotal: 0,
      total: 0,
    };

    const result = await service.createOrder(input);

    expect(createOrderAction).toHaveBeenCalledWith("token-1", input);
    expect(result).toEqual({ orderId: "o1" });
  });

  it("advanceStatus delegates to the server action without a reason", async () => {
    await service.advanceStatus("o1", "delivering");
    expect(updateOrderStatusAction).toHaveBeenCalledWith("token-1", "o1", {
      status: "delivering",
    });
  });

  it("cancelOrder delegates to the server action with the cancellation status and reason", async () => {
    await service.cancelOrder("o1", "Changement d'avis");
    expect(updateOrderStatusAction).toHaveBeenCalledWith("token-1", "o1", {
      status: "cancelled",
      reason: "Changement d'avis",
    });
  });

  it("markReturned delegates to the server action with the chosen outcome and reason", async () => {
    await service.markReturned("o1", "defective", "Produit cassé");
    expect(updateOrderStatusAction).toHaveBeenCalledWith("token-1", "o1", {
      status: "defective",
      reason: "Produit cassé",
    });
  });
});

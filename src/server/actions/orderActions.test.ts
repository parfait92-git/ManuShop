jest.mock("../auth/requireCaller", () => ({ requireCaller: jest.fn() }));

const incrementMock = jest.fn((n: number) => ({ __op: "increment", n }));
const serverTimestampMock = jest.fn(() => ({ __op: "serverTimestamp" }));
jest.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    increment: (n: number) => incrementMock(n),
    serverTimestamp: () => serverTimestampMock(),
  },
}));

const batchUpdateMock = jest.fn();
const batchSetMock = jest.fn();
const batchCommitMock = jest.fn();
const batchMock = jest.fn(() => ({
  update: batchUpdateMock,
  set: batchSetMock,
  commit: batchCommitMock,
}));

const userGetMock = jest.fn();
const userDocMock = jest.fn(() => ({ get: userGetMock }));

const orderGetMock = jest.fn();
const orderDocMock = jest.fn((id?: string) => ({
  id: id ?? "order-new",
  get: orderGetMock,
}));

const productDocMock = jest.fn((id: string) => ({ __ref: `products/${id}` }));

const shopGetMock = jest.fn();
const shopDocMock = jest.fn(() => ({ get: shopGetMock }));

const collectionMock = jest.fn((name: string) => {
  if (name === "users") return { doc: userDocMock };
  if (name === "orders") return { doc: orderDocMock };
  if (name === "products") return { doc: productDocMock };
  if (name === "shops") return { doc: shopDocMock };
  throw new Error(`Unexpected collection: ${name}`);
});

jest.mock("../../lib/firebaseAdmin", () => ({
  getAdminDb: () => ({ collection: collectionMock, batch: batchMock }),
}));

const sendOrderNotificationMock = jest.fn();
jest.mock("../../lib/whatsappBusiness", () => ({
  sendOrderNotification: (...args: unknown[]) => sendOrderNotificationMock(...args),
}));

import { requireCaller } from "@/server/auth/requireCaller";
import {
  createOrderAction,
  updateOrderStatusAction,
} from "@/server/actions/orderActions";
import { ForbiddenError, NotFoundError, ValidationError } from "@/server/errors";

const requireCallerMock = requireCaller as jest.Mock;

const ITEMS = [{ productId: "p1", name: "Wax", quantity: 2, unitPrice: 5000 }];

describe("createOrderAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireCallerMock.mockResolvedValue({ uid: "client-1", email: "c@b.com" });
    shopGetMock.mockResolvedValue({
      data: () => ({ whatsapp: "+237600000001", notifyOrdersBySocial: true }),
    });
  });

  it("creates the order under the caller's own clientId and decrements stock", async () => {
    const result = await createOrderAction("token", {
      shopId: "shop-1",
      clientName: "Fatou Ba",
      clientPhone: "+237600000000",
      clientAddress: "Douala",
      items: ITEMS,
      subtotal: 10000,
      total: 10000,
    });

    expect(collectionMock).toHaveBeenCalledWith("orders");
    expect(batchSetMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "order-new" }),
      expect.objectContaining({
        shopId: "shop-1",
        clientId: "client-1",
        status: "under_review",
      })
    );
    expect(batchUpdateMock).toHaveBeenCalledWith(
      { __ref: "products/p1" },
      { stock: { __op: "increment", n: -2 } }
    );
    expect(batchCommitMock).toHaveBeenCalled();
    expect(result).toEqual({ orderId: "order-new" });
    expect(sendOrderNotificationMock).toHaveBeenCalledWith({
      shopWhatsapp: "+237600000001",
      orderId: "order-new",
      clientName: "Fatou Ba",
      total: 10000,
    });
  });

  it("skips the WhatsApp notification when the shop opted out", async () => {
    shopGetMock.mockResolvedValue({
      data: () => ({ whatsapp: "+237600000001", notifyOrdersBySocial: false }),
    });

    await createOrderAction("token", {
      shopId: "shop-1",
      clientName: "Fatou Ba",
      clientPhone: "+237600000000",
      clientAddress: "Douala",
      items: ITEMS,
      subtotal: 10000,
      total: 10000,
    });

    expect(sendOrderNotificationMock).not.toHaveBeenCalled();
  });

  it("omits clientId for a manual order created by the shop's merchant", async () => {
    userGetMock.mockResolvedValue({
      data: () => ({ role: "admin", shopId: "shop-1" }),
    });

    await createOrderAction("token", {
      shopId: "shop-1",
      clientName: "Client de passage",
      clientPhone: "",
      clientAddress: "",
      items: ITEMS,
      subtotal: 10000,
      total: 10000,
      manual: true,
    });

    const [, data] = batchSetMock.mock.calls[0];
    expect(data).not.toHaveProperty("clientId");
  });

  it("rejects a manual order from someone who isn't the shop's merchant", async () => {
    userGetMock.mockResolvedValue({ data: () => ({ role: "client" }) });

    await expect(
      createOrderAction("token", {
        shopId: "shop-1",
        clientName: "x",
        clientPhone: "",
        clientAddress: "",
        items: ITEMS,
        subtotal: 10000,
        total: 10000,
        manual: true,
      })
    ).rejects.toThrow(ForbiddenError);
  });
});

describe("updateOrderStatusAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireCallerMock.mockResolvedValue({ uid: "merchant-1", email: "m@b.com" });
  });

  function mockOrder(overrides: Record<string, unknown> = {}) {
    orderGetMock.mockResolvedValue({
      exists: true,
      data: () => ({
        shopId: "shop-1",
        clientId: "client-1",
        status: "under_review",
        items: ITEMS,
        ...overrides,
      }),
    });
  }

  it("throws NotFoundError when the order doesn't exist", async () => {
    orderGetMock.mockResolvedValue({ exists: false });
    await expect(
      updateOrderStatusAction("token", "missing", { status: "delivering" })
    ).rejects.toThrow(NotFoundError);
  });

  it("lets the shop's merchant advance the status, without restocking", async () => {
    mockOrder();
    userGetMock.mockResolvedValue({
      data: () => ({ role: "admin", shopId: "shop-1" }),
    });

    await updateOrderStatusAction("token", "order-1", {
      status: "ready_for_delivery",
    });

    expect(batchUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "order-1" }),
      expect.objectContaining({ status: "ready_for_delivery" })
    );
    expect(batchUpdateMock).toHaveBeenCalledTimes(1);
  });

  it("rejects a status advance from someone who isn't the shop's merchant", async () => {
    mockOrder();
    userGetMock.mockResolvedValue({ data: () => ({ role: "client" }) });

    await expect(
      updateOrderStatusAction("token", "order-1", { status: "delivering" })
    ).rejects.toThrow(ForbiddenError);
  });

  it("lets the order's own client cancel it while still under review, with a reason, and restocks", async () => {
    mockOrder();
    requireCallerMock.mockResolvedValue({ uid: "client-1", email: "c@b.com" });
    userGetMock.mockResolvedValue({ data: () => ({ role: "client" }) });

    await updateOrderStatusAction("token", "order-1", {
      status: "cancelled",
      reason: "Changement d'avis",
    });

    expect(batchUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "order-1" }),
      expect.objectContaining({
        status: "cancelled",
        cancelReason: "Changement d'avis",
      })
    );
    expect(batchUpdateMock).toHaveBeenCalledWith(
      { __ref: "products/p1" },
      { stock: { __op: "increment", n: 2 } }
    );
  });

  it("rejects cancellation without a reason", async () => {
    mockOrder();
    requireCallerMock.mockResolvedValue({ uid: "client-1", email: "c@b.com" });

    await expect(
      updateOrderStatusAction("token", "order-1", { status: "cancelled" })
    ).rejects.toThrow(ValidationError);
  });

  it("rejects cancellation once the order is past under_review", async () => {
    mockOrder({ status: "delivering" });
    requireCallerMock.mockResolvedValue({ uid: "client-1", email: "c@b.com" });

    await expect(
      updateOrderStatusAction("token", "order-1", {
        status: "cancelled",
        reason: "Trop tard",
      })
    ).rejects.toThrow(ValidationError);
  });

  it("rejects cancellation from an unrelated caller", async () => {
    mockOrder();
    requireCallerMock.mockResolvedValue({ uid: "stranger", email: "s@b.com" });
    userGetMock.mockResolvedValue({ data: () => ({ role: "client" }) });

    await expect(
      updateOrderStatusAction("token", "order-1", {
        status: "cancelled",
        reason: "x",
      })
    ).rejects.toThrow(ForbiddenError);
  });

  it("lets the merchant mark a delivered order as defective, with a reason, and restocks", async () => {
    mockOrder({ status: "delivered" });
    userGetMock.mockResolvedValue({
      data: () => ({ role: "seller", shopId: "shop-1" }),
    });

    await updateOrderStatusAction("token", "order-1", {
      status: "defective",
      reason: "Produit cassé à la livraison",
    });

    expect(batchUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "order-1" }),
      expect.objectContaining({
        status: "defective",
        returnReason: "Produit cassé à la livraison",
      })
    );
    expect(batchUpdateMock).toHaveBeenCalledWith(
      { __ref: "products/p1" },
      { stock: { __op: "increment", n: 2 } }
    );
  });

  it("rejects marking as returned a client (the owner can't do this, only the merchant)", async () => {
    mockOrder({ status: "delivered" });
    requireCallerMock.mockResolvedValue({ uid: "client-1", email: "c@b.com" });
    userGetMock.mockResolvedValue({ data: () => ({ role: "client" }) });

    await expect(
      updateOrderStatusAction("token", "order-1", {
        status: "returned",
        reason: "x",
      })
    ).rejects.toThrow(ForbiddenError);
  });

  it("rejects marking as returned an order that isn't delivered yet", async () => {
    mockOrder({ status: "ready_for_delivery" });
    userGetMock.mockResolvedValue({
      data: () => ({ role: "admin", shopId: "shop-1" }),
    });

    await expect(
      updateOrderStatusAction("token", "order-1", {
        status: "returned",
        reason: "x",
      })
    ).rejects.toThrow(ValidationError);
  });
});

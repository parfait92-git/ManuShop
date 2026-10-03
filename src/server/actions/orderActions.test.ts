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

// `createOrderAction` utilise une transaction (pas `batch()`, qui ne lit
// jamais rien — voir le commentaire sur la fonction) : simule l'API
// `runTransaction` de firebase-admin en appelant directement le callback
// avec un objet transaction dont `get`/`set`/`update` sont ces mêmes mocks.
const transactionGetMock = jest.fn();
// Prix d'achat (`productCosts`), lus dans la même transaction : séparés des
// lectures de produits pour que chaque test garde la maîtrise de celles-ci.
const productCostGetMock = jest.fn();
const transactionSetMock = jest.fn();
const transactionUpdateMock = jest.fn();
const runTransactionMock = jest.fn(
  async (
    updateFunction: (transaction: {
      get: typeof transactionGetMock;
      set: typeof transactionSetMock;
      update: typeof transactionUpdateMock;
    }) => Promise<void>
  ) => {
    await updateFunction({
      get: ((ref: { __ref?: string }) =>
        ref.__ref?.startsWith("productCosts/")
          ? productCostGetMock(ref)
          : transactionGetMock(ref)) as typeof transactionGetMock,
      set: transactionSetMock,
      update: transactionUpdateMock,
    });
  }
);

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
  if (name === "productCosts") return { doc: (id: string) => ({ __ref: `productCosts/${id}` }) };
  if (name === "orderCosts") return { doc: (id: string) => ({ __ref: `orderCosts/${id}` }) };
  if (name === "shops") return { doc: shopDocMock };
  throw new Error(`Unexpected collection: ${name}`);
});

jest.mock("../../lib/firebaseAdmin", () => ({
  getAdminDb: () => ({
    collection: collectionMock,
    batch: batchMock,
    runTransaction: runTransactionMock,
  }),
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
    // Stock largement suffisant par défaut — chaque test de survente le
    // redéfinit explicitement (`mockResolvedValueOnce`).
    transactionGetMock.mockResolvedValue({
      exists: true,
      data: () => ({ stock: 100, price: 5000 }),
    });
    productCostGetMock.mockResolvedValue({ data: () => undefined });
  });

  it("freezes each item's purchase price in a private orderCosts document — never on the order the client can read", async () => {
    productCostGetMock.mockImplementation(async (ref: { __ref: string }) => ({
      data: () => (ref.__ref === "productCosts/p1" ? { purchasePrice: 3000 } : undefined),
    }));

    await createOrderAction("token", {
      shopId: "shop-1",
      clientName: "Fatou Ba",
      clientPhone: "+237600000000",
      clientAddress: "Douala",
      items: [
        { productId: "p1", name: "Wax", quantity: 2, unitPrice: 5000 },
        { productId: "p2", name: "Savon", quantity: 1, unitPrice: 5000 },
      ],
      subtotal: 15000,
      total: 15000,
    });

    expect(transactionSetMock).toHaveBeenCalledWith(
      { __ref: "orderCosts/order-new" },
      expect.objectContaining({
        shopId: "shop-1",
        items: [{ productId: "p1", unitCost: 3000 }, { productId: "p2" }],
      })
    );
    const orderWrite = transactionSetMock.mock.calls.find(
      ([ref]) => (ref as { id?: string }).id === "order-new"
    )![1];
    expect(JSON.stringify(orderWrite)).not.toContain("3000");
  });

  describe("prix recalculé côté serveur (fin de promotion automatique)", () => {
    const base = {
      shopId: "shop-1",
      clientName: "Fatou Ba",
      clientPhone: "+237600000000",
      clientAddress: "Douala",
    };
    const DAY = 24 * 60 * 60 * 1000;
    const timestampIn = (ms: number) => ({ toDate: () => new Date(Date.now() + ms) });

    it("charges the current promo price, whatever price the cart sent", async () => {
      transactionGetMock.mockResolvedValueOnce({
        exists: true,
        data: () => ({ stock: 10, price: 5000, isPromo: true, promoPrice: 4000, promoEnd: timestampIn(3 * DAY) }),
      });

      await createOrderAction("token", {
        ...base,
        items: [{ productId: "p1", name: "Wax", quantity: 2, unitPrice: 1 }],
        subtotal: 2,
        total: 2,
      });

      expect(transactionSetMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          items: [expect.objectContaining({ unitPrice: 4000 })],
          subtotal: 8000,
          total: 8000,
        })
      );
    });

    it("charges the regular price once the promo end date is past — an item kept in the cart since the promo no longer gets it", async () => {
      transactionGetMock.mockResolvedValueOnce({
        exists: true,
        data: () => ({ stock: 10, price: 5000, isPromo: true, promoPrice: 4000, promoEnd: timestampIn(-3 * DAY) }),
      });

      await createOrderAction("token", {
        ...base,
        items: [{ productId: "p1", name: "Wax", quantity: 2, unitPrice: 4000 }],
        subtotal: 8000,
        total: 8000,
      });

      expect(transactionSetMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ subtotal: 10000, total: 10000 })
      );
      expect(sendOrderNotificationMock).toHaveBeenCalledWith(
        expect.objectContaining({ total: 10000 })
      );
    });

    it("rejects an online order for a product without a readable price rather than recording NaN", async () => {
      transactionGetMock.mockResolvedValueOnce({ exists: true, data: () => ({ stock: 10 }) });

      await expect(
        createOrderAction("token", { ...base, items: ITEMS, subtotal: 10000, total: 10000 })
      ).rejects.toBeInstanceOf(ValidationError);
      expect(transactionSetMock).not.toHaveBeenCalled();
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
    expect(transactionSetMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "order-new" }),
      expect.objectContaining({
        shopId: "shop-1",
        clientId: "client-1",
        status: "under_review",
      })
    );
    expect(transactionUpdateMock).toHaveBeenCalledWith(
      { __ref: "products/p1" },
      { stock: { __op: "increment", n: -2 } }
    );
    expect(result).toEqual({ orderId: "order-new" });
    expect(sendOrderNotificationMock).toHaveBeenCalledWith({
      shopWhatsapp: "+237600000001",
      orderId: "order-new",
      clientName: "Fatou Ba",
      total: 10000,
    });
  });

  it("rejects the order when a product doesn't have enough stock left", async () => {
    transactionGetMock.mockResolvedValueOnce({
      exists: true,
      data: () => ({ stock: 1, price: 5000 }),
    });

    await expect(
      createOrderAction("token", {
        shopId: "shop-1",
        clientName: "Fatou Ba",
        clientPhone: "+237600000000",
        clientAddress: "Douala",
        items: ITEMS, // quantity: 2
        subtotal: 10000,
        total: 10000,
      })
    ).rejects.toThrow(/Stock insuffisant pour « Wax » \(1 disponible\)/);

    expect(transactionSetMock).not.toHaveBeenCalled();
    expect(transactionUpdateMock).not.toHaveBeenCalled();
    expect(sendOrderNotificationMock).not.toHaveBeenCalled();
  });

  it("rejects the order when the product no longer exists", async () => {
    transactionGetMock.mockResolvedValueOnce({ exists: false, data: () => undefined });

    await expect(
      createOrderAction("token", {
        shopId: "shop-1",
        clientName: "Fatou Ba",
        clientPhone: "+237600000000",
        clientAddress: "Douala",
        items: ITEMS,
        subtotal: 10000,
        total: 10000,
      })
    ).rejects.toThrow(ValidationError);
  });

  it("allows an order that exactly matches the remaining stock", async () => {
    transactionGetMock.mockResolvedValueOnce({
      exists: true,
      data: () => ({ stock: 2, price: 5000 }),
    });

    await expect(
      createOrderAction("token", {
        shopId: "shop-1",
        clientName: "Fatou Ba",
        clientPhone: "+237600000000",
        clientAddress: "Douala",
        items: ITEMS, // quantity: 2
        subtotal: 10000,
        total: 10000,
      })
    ).resolves.toEqual({ orderId: "order-new" });
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

    const [, data] = transactionSetMock.mock.calls[0];
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

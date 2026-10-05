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
const batchCreateMock = jest.fn();
const batchMock = jest.fn(() => ({
  update: batchUpdateMock,
  set: batchSetMock,
  create: batchCreateMock,
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
const transactionCreateMock = jest.fn();
const runTransactionMock = jest.fn(
  async (
    updateFunction: (transaction: {
      get: typeof transactionGetMock;
      set: typeof transactionSetMock;
      update: typeof transactionUpdateMock;
      create: typeof transactionCreateMock;
    }) => Promise<void>
  ) => {
    await updateFunction({
      get: ((ref: { __ref?: string }) =>
        ref.__ref?.startsWith("productCosts/")
          ? productCostGetMock(ref)
          : transactionGetMock(ref)) as typeof transactionGetMock,
      set: transactionSetMock,
      update: transactionUpdateMock,
      create: transactionCreateMock,
    });
  }
);

const userGetMock = jest.fn();
const userDocMock = jest.fn(() => ({ get: userGetMock }));

const orderGetMock = jest.fn();
const orderDocMock = jest.fn((id?: string) => ({
  id: id ?? "order-new",
  get: orderGetMock,
  // Historique signé (`orders/{id}/history/{seq}`).
  collection: (name: string) => ({
    doc: (eventId: string) => ({ __ref: `orders/${id ?? "order-new"}/${name}/${eventId}` }),
  }),
}));

// Lecture d'un produit hors transaction (remise en stock d'une commande,
// pour l'historique du stock) — non énumérable, pour que les assertions
// sur `{ __ref }` restent exactes.
const productGetMock = jest.fn();
const productDocMock = jest.fn((id: string) => {
  const ref = { __ref: `products/${id}` };
  Object.defineProperty(ref, "get", { value: () => productGetMock(id), enumerable: false });
  return ref;
});

const shopGetMock = jest.fn();
const shopDocMock = jest.fn(() => ({ get: shopGetMock }));

const collectionMock = jest.fn((name: string) => {
  if (name === "users") return { doc: userDocMock };
  if (name === "orders") return { doc: orderDocMock };
  if (name === "products") return { doc: productDocMock };
  if (name === "productCosts") return { doc: (id: string) => ({ __ref: `productCosts/${id}` }) };
  if (name === "orderCosts") return { doc: (id: string) => ({ __ref: `orderCosts/${id}` }) };
  if (name === "shops") return { doc: shopDocMock };
  if (name === "notifications") return { doc: () => ({ __ref: "notifications/new" }) };
  if (name === "stockMovements") return { doc: () => ({ __ref: "stockMovements/new" }) };
  throw new Error(`Unexpected collection: ${name}`);
});

jest.mock("../../lib/firebaseAdmin", () => ({
  getAdminDb: () => ({
    collection: collectionMock,
    batch: batchMock,
    runTransaction: runTransactionMock,
  }),
}));

const ensureInvoiceMock = jest.fn();
jest.mock("../invoices/issueInvoice", () => ({
  ensureInvoice: (...args: unknown[]) => ensureInvoiceMock(...args),
}));

const pushNewOrderMock = jest.fn(async () => 0);
const pushStockAlertsMock = jest.fn(async () => 0);
const pushOrderStatusMock = jest.fn(async () => 0);
const pushOrderCancelledByClientMock = jest.fn(async () => 0);
jest.mock("../push/events", () => ({
  pushNewOrder: (...a: unknown[]) => pushNewOrderMock(...(a as [])),
  pushStockAlerts: (...a: unknown[]) => pushStockAlertsMock(...(a as [])),
  pushOrderStatus: (...a: unknown[]) => pushOrderStatusMock(...(a as [])),
  pushOrderCancelledByClient: (...a: unknown[]) => pushOrderCancelledByClientMock(...(a as [])),
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
      data: () => ({ shopId: "shop-1", stock: 100, price: 5000 }),
    });
    productCostGetMock.mockResolvedValue({ data: () => undefined });
  });

  // Historique signé (2026-10-03) : premier maillon écrit avec la commande.
  it("starts the order's chained history with its creation", async () => {
    await createOrderAction("token", {
      shopId: "shop-1",
      clientName: "Fatou Ba",
      clientPhone: "+237600000000",
      clientAddress: "Douala",
      items: [{ productId: "p1", name: "Wax", quantity: 1, unitPrice: 5000 }],
      subtotal: 5000,
      total: 5000,
    });

    const [ref, event] = transactionCreateMock.mock.calls[0];
    expect(ref).toEqual({ __ref: "orders/order-new/history/000001" });
    expect(event).toEqual(
      expect.objectContaining({
        seq: 1,
        fact: { type: "status", status: "under_review" },
        prevHash: "0".repeat(64),
        hash: expect.stringMatching(/^[0-9a-f]{64}$/),
      })
    );
    expect(transactionSetMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "order-new" }),
      expect.objectContaining({ historySeq: 1, historyHash: event.hash })
    );
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

  it("rejects an item belonging to another shop — an order goes to a single shop", async () => {
    transactionGetMock.mockResolvedValueOnce({
      exists: true,
      data: () => ({ shopId: "other-shop", stock: 10, price: 5000 }),
    });

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
    ).rejects.toThrow("n'appartient pas à cette boutique");
    expect(transactionSetMock).not.toHaveBeenCalled();
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
        data: () => ({ shopId: "shop-1", stock: 10, price: 5000, isPromo: true, promoPrice: 4000, promoEnd: timestampIn(3 * DAY) }),
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
        data: () => ({ shopId: "shop-1", stock: 10, price: 5000, isPromo: true, promoPrice: 4000, promoEnd: timestampIn(-3 * DAY) }),
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
      transactionGetMock.mockResolvedValueOnce({ exists: true, data: () => ({ shopId: "shop-1", stock: 10 }) });

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
    // Historique du stock (BF-15) : la sortie et le stock restant.
    expect(transactionSetMock).toHaveBeenCalledWith(
      { __ref: "stockMovements/new" },
      expect.objectContaining({
        shopId: "shop-1",
        productId: "p1",
        type: "order",
        quantity: -2,
        stockAfter: 98,
        orderId: "order-new",
      })
    );
    expect(transactionSetMock.mock.calls.find(([ref]) => ref.__ref === "stockMovements/new")?.[1]).not.toHaveProperty("actorId");
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
      data: () => ({ shopId: "shop-1", stock: 1, price: 5000 }),
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
      data: () => ({ shopId: "shop-1", stock: 2, price: 5000 }),
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
    productGetMock.mockResolvedValue({ exists: true, data: () => ({ name: "Wax", stock: 5 }) });
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

  it("chains each status change to the previous step of the order's history", async () => {
    mockOrder({ historySeq: 2, historyHash: "a".repeat(64) });
    userGetMock.mockResolvedValue({ data: () => ({ role: "admin", shopId: "shop-1" }) });

    await updateOrderStatusAction("token", "order-1", { status: "ready_for_delivery" });

    const [ref, event] = batchCreateMock.mock.calls[0];
    expect(ref).toEqual({ __ref: "orders/order-1/history/000003" });
    expect(event).toEqual(
      expect.objectContaining({
        seq: 3,
        fact: { type: "status", status: "ready_for_delivery" },
        prevHash: "a".repeat(64),
      })
    );
    expect(batchUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "order-1" }),
      expect.objectContaining({ historySeq: 3, historyHash: event.hash })
    );
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
    expect(batchSetMock).toHaveBeenCalledWith(
      { __ref: "stockMovements/new" },
      expect.objectContaining({
        productId: "p1",
        type: "cancelled",
        quantity: 2,
        stockAfter: 7,
        orderId: "order-1",
        note: "Changement d'avis",
        actorId: "client-1",
      })
    );
  });

  it("doesn't restock a product deleted since the order (its update would fail the whole write)", async () => {
    mockOrder();
    requireCallerMock.mockResolvedValue({ uid: "client-1", email: "c@b.com" });
    userGetMock.mockResolvedValue({ data: () => ({ role: "client" }) });
    productGetMock.mockResolvedValue({ exists: false, data: () => undefined });

    await updateOrderStatusAction("token", "order-1", { status: "cancelled", reason: "x" });

    expect(batchUpdateMock).not.toHaveBeenCalledWith({ __ref: "products/p1" }, expect.anything());
    expect(batchSetMock).not.toHaveBeenCalledWith({ __ref: "stockMovements/new" }, expect.anything());
    expect(batchCommitMock).toHaveBeenCalled();
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

  // Avis après livraison (2026-10-02) : le client est invité, dans
  // l'application, à donner son avis dès que la commande est livrée.
  it("notifies the client in-app when the order becomes delivered", async () => {
    mockOrder({ status: "delivering" });
    userGetMock.mockResolvedValue({ data: () => ({ role: "seller", shopId: "shop-1" }) });
    shopGetMock.mockResolvedValue({ data: () => ({ name: "Chez Awa" }) });

    await updateOrderStatusAction("token", "order-1", { status: "delivered" });

    expect(batchSetMock).toHaveBeenCalledWith(
      { __ref: "notifications/new" },
      expect.objectContaining({
        userId: "client-1",
        type: "review_request",
        orderId: "order-1",
        shopId: "shop-1",
        link: "/mes-commandes/order-1/avis",
        read: false,
        message: expect.stringContaining("Chez Awa"),
      })
    );
    expect(batchCommitMock).toHaveBeenCalledTimes(1);
    // Facture émise dès la livraison (BF-24).
    expect(ensureInvoiceMock).toHaveBeenCalledWith(expect.anything(), "order-1");
  });

  it("keeps the delivery when issuing the invoice fails", async () => {
    mockOrder({ status: "delivering" });
    userGetMock.mockResolvedValue({ data: () => ({ role: "admin", shopId: "shop-1" }) });
    shopGetMock.mockResolvedValue({ data: () => ({ name: "Chez Awa" }) });
    ensureInvoiceMock.mockRejectedValueOnce(new Error("réseau"));
    jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      updateOrderStatusAction("token", "order-1", { status: "delivered" })
    ).resolves.toBeUndefined();
    expect(batchCommitMock).toHaveBeenCalledTimes(1);
  });

  it("sends no review request for a manual order without a client account", async () => {
    mockOrder({ status: "delivering", clientId: undefined });
    userGetMock.mockResolvedValue({ data: () => ({ role: "admin", shopId: "shop-1" }) });

    await updateOrderStatusAction("token", "order-1", { status: "delivered" });

    expect(batchSetMock).not.toHaveBeenCalledWith(
      { __ref: "notifications/new" },
      expect.anything()
    );
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
    expect(batchSetMock).toHaveBeenCalledWith(
      { __ref: "stockMovements/new" },
      expect.objectContaining({ type: "defective", quantity: 2, stockAfter: 7 })
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

describe("versions d'un produit (BF-17)", () => {
  const coco = {
    shopId: "shop-1",
    name: "Huile de coco",
    price: 3000,
    stock: 7,
    variants: {
      v250: { label: "250 ml", stock: 5, position: 0 },
      v500: { label: "500 ml", stock: 2, price: 5500, position: 1 },
    },
  };
  const order = (items: unknown[]) =>
    createOrderAction("token", {
      shopId: "shop-1",
      clientName: "Fatou",
      clientPhone: "+237600000000",
      clientAddress: "Douala",
      items: items as never,
      subtotal: 0,
      total: 0,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    requireCallerMock.mockResolvedValue({ uid: "client-1", email: "c@b.com" });
    shopGetMock.mockResolvedValue({ data: () => ({}) });
    transactionGetMock.mockResolvedValue({ exists: true, data: () => coco });
    productCostGetMock.mockResolvedValue({ data: () => undefined });
  });

  it("charges each version at its own price, names it, and takes it out of its own stock", async () => {
    await order([
      { productId: "p1", name: "Huile de coco", quantity: 2, unitPrice: 1, variantId: "v250" },
      { productId: "p1", name: "Huile de coco", quantity: 1, unitPrice: 1, variantId: "v500" },
    ]);

    const saved = transactionSetMock.mock.calls.find(([ref]) => ref.id === "order-new")?.[1];
    expect(saved.items).toEqual([
      { productId: "p1", name: "Huile de coco — 250 ml", quantity: 2, unitPrice: 3000, variantId: "v250", variantLabel: "250 ml" },
      { productId: "p1", name: "Huile de coco — 500 ml", quantity: 1, unitPrice: 5500, variantId: "v500", variantLabel: "500 ml" },
    ]);
    expect(saved.total).toBe(11500);
    // Une seule écriture pour le produit : total et chaque version.
    expect(transactionUpdateMock).toHaveBeenCalledTimes(1);
    expect(transactionUpdateMock).toHaveBeenCalledWith(
      { __ref: "products/p1" },
      {
        stock: { __op: "increment", n: -3 },
        "variants.v250.stock": { __op: "increment", n: -2 },
        "variants.v500.stock": { __op: "increment", n: -1 },
      }
    );
    const movements = transactionSetMock.mock.calls.filter(([ref]) => ref.__ref === "stockMovements/new").map(([, m]) => m);
    expect(movements.map((m) => [m.productName, m.variantId, m.quantity, m.stockAfter])).toEqual([
      ["Huile de coco — 250 ml", "v250", -2, 3],
      ["Huile de coco — 500 ml", "v500", -1, 1],
    ]);
  });

  it("requires a version for a product that has some, and refuses one for a product that has none", async () => {
    await expect(order([{ productId: "p1", name: "Huile de coco", quantity: 1, unitPrice: 1 }])).rejects.toThrow(
      /Choisissez une version/
    );
    await expect(
      order([{ productId: "p1", name: "Huile de coco", quantity: 1, unitPrice: 1, variantId: "v1l" }])
    ).rejects.toThrow(/Choisissez une version/);
    transactionGetMock.mockResolvedValue({ exists: true, data: () => ({ shopId: "shop-1", price: 1500, stock: 9 }) });
    await expect(order([{ productId: "p2", name: "Savon", quantity: 1, unitPrice: 1, variantId: "x" }])).rejects.toThrow(
      /n'existe pas en plusieurs versions/
    );
    expect(transactionUpdateMock).not.toHaveBeenCalled();
  });

  it("checks the stock of the chosen version, not the product's total", async () => {
    await expect(
      order([{ productId: "p1", name: "Huile de coco", quantity: 3, unitPrice: 1, variantId: "v500" }])
    ).rejects.toThrow("Stock insuffisant pour « Huile de coco — 500 ml » (2 disponibles).");
  });

  describe("remise en stock", () => {
    beforeEach(() => {
      requireCallerMock.mockResolvedValue({ uid: "merchant-1", email: "m@b.com" });
      userGetMock.mockResolvedValue({ data: () => ({ role: "admin", shopId: "shop-1", displayName: "Awa" }) });
      orderGetMock.mockResolvedValue({
        exists: true,
        data: () => ({
          shopId: "shop-1",
          status: "delivered",
          items: [
            { productId: "p1", name: "Huile de coco — 500 ml", quantity: 1, variantId: "v500", variantLabel: "500 ml" },
            { productId: "p1", name: "Huile de coco — 1 l", quantity: 2, variantId: "v1l", variantLabel: "1 l" },
          ],
        }),
      });
      productGetMock.mockResolvedValue({ exists: true, data: () => coco });
    });

    it("puts each version back in its own stock, and skips a version deleted since", async () => {
      await updateOrderStatusAction("token", "order-1", { status: "returned", reason: "Flacon fêlé" });

      expect(batchUpdateMock).toHaveBeenCalledWith(
        { __ref: "products/p1" },
        { stock: { __op: "increment", n: 1 }, "variants.v500.stock": { __op: "increment", n: 1 } }
      );
      const movements = batchSetMock.mock.calls.filter(([ref]) => ref.__ref === "stockMovements/new").map(([, m]) => m);
      expect(movements).toHaveLength(1);
      expect(movements[0]).toEqual(
        expect.objectContaining({ productName: "Huile de coco — 500 ml", variantId: "v500", quantity: 1, stockAfter: 3, type: "returned" })
      );
    });
  });
});

describe("notifications push (2026-10-04)", () => {
  const base = {
    shopId: "shop-1",
    clientName: "Fatou",
    clientPhone: "+237600000000",
    clientAddress: "Douala",
    subtotal: 0,
    total: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    requireCallerMock.mockResolvedValue({ uid: "client-1", email: "c@b.com" });
    shopGetMock.mockResolvedValue({ data: () => ({ name: "Chez Awa" }) });
    productCostGetMock.mockResolvedValue({ data: () => undefined });
  });

  it("tells the shop team about a new online order", async () => {
    transactionGetMock.mockResolvedValue({ exists: true, data: () => ({ shopId: "shop-1", price: 5000, stock: 100, stockThreshold: 2 }) });
    await createOrderAction("token", { ...base, items: [{ productId: "p1", name: "Wax", quantity: 2, unitPrice: 1 }] });
    expect(pushNewOrderMock).toHaveBeenCalledWith(expect.anything(), {
      shopId: "shop-1",
      orderId: "order-new",
      clientName: "Fatou",
      units: 2,
      total: 10000,
    });
    expect(pushStockAlertsMock).toHaveBeenCalledWith(expect.anything(), "shop-1", []);
  });

  it("alerts the team once, when an order takes a stock down to its threshold", async () => {
    transactionGetMock.mockResolvedValue({ exists: true, data: () => ({ shopId: "shop-1", name: "Wax", price: 5000, stock: 4, stockThreshold: 2 }) });
    await createOrderAction("token", { ...base, items: [{ productId: "p1", name: "Wax", quantity: 2, unitPrice: 1 }] });
    expect(pushStockAlertsMock).toHaveBeenCalledWith(expect.anything(), "shop-1", [{ name: "Wax", stock: 2 }]);

    // Déjà sous le seuil : pas de nouvelle alerte.
    pushStockAlertsMock.mockClear();
    transactionGetMock.mockResolvedValue({ exists: true, data: () => ({ shopId: "shop-1", name: "Wax", price: 5000, stock: 2, stockThreshold: 2 }) });
    await createOrderAction("token", { ...base, items: [{ productId: "p1", name: "Wax", quantity: 1, unitPrice: 1 }] });
    expect(pushStockAlertsMock).toHaveBeenCalledWith(expect.anything(), "shop-1", []);
  });

  it("doesn't announce a manual order to the team that just entered it", async () => {
    requireCallerMock.mockResolvedValue({ uid: "merchant-1", email: "m@b.com" });
    userGetMock.mockResolvedValue({ data: () => ({ role: "seller", shopId: "shop-1" }) });
    transactionGetMock.mockResolvedValue({ exists: true, data: () => ({ shopId: "shop-1", price: 5000, stock: 100 }) });
    await createOrderAction("token", { ...base, manual: true, items: [{ productId: "p1", name: "Wax", quantity: 1, unitPrice: 5000 }] });
    expect(pushNewOrderMock).not.toHaveBeenCalled();
  });

  describe("changement de statut", () => {
    beforeEach(() => {
      orderGetMock.mockResolvedValue({
        exists: true,
        data: () => ({ shopId: "shop-1", clientId: "client-1", clientName: "Fatou", status: "under_review", items: [] }),
      });
    });

    it("tells the client when the shop moves the order forward", async () => {
      requireCallerMock.mockResolvedValue({ uid: "merchant-1", email: "m@b.com" });
      userGetMock.mockResolvedValue({ data: () => ({ role: "admin", shopId: "shop-1" }) });
      await updateOrderStatusAction("token", "order-1", { status: "ready_for_delivery" });
      expect(pushOrderStatusMock).toHaveBeenCalledWith(expect.anything(), {
        clientId: "client-1",
        orderId: "order-1",
        status: "ready_for_delivery",
        shopName: "Chez Awa",
      });
      expect(pushOrderCancelledByClientMock).not.toHaveBeenCalled();
    });

    it("tells the team, not the client, when the client cancels", async () => {
      userGetMock.mockResolvedValue({ data: () => ({ role: "client" }) });
      await updateOrderStatusAction("token", "order-1", { status: "cancelled", reason: "Erreur" });
      expect(pushOrderCancelledByClientMock).toHaveBeenCalledWith(expect.anything(), {
        shopId: "shop-1",
        orderId: "order-1",
        clientName: "Fatou",
      });
      expect(pushOrderStatusMock).not.toHaveBeenCalled();
    });
  });
});

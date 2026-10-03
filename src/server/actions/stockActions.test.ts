jest.mock("../auth/requireCaller", () => ({ requireCaller: jest.fn() }));

jest.mock("firebase-admin/firestore", () => ({
  FieldValue: { serverTimestamp: () => ({ __op: "serverTimestamp" }) },
}));

const userGetMock = jest.fn();
const productGetMock = jest.fn();
const movementsQueryGetMock = jest.fn();
const txUpdateMock = jest.fn();
const txSetMock = jest.fn();

/** Requête `stockMovements` (shopId, productId, limit) : garde ses filtres
 * pour vérifier qu'elle reste bornée à la boutique. */
function movementsQuery(filters: unknown[] = []) {
  return {
    __query: "stockMovements",
    filters,
    where: (field: string, op: string, value: unknown) => movementsQuery([...filters, [field, op, value]]),
    limit: () => movementsQuery(filters),
  };
}

const collectionMock = jest.fn((name: string) => {
  if (name === "users") return { doc: () => ({ get: userGetMock }) };
  if (name === "products") return { doc: (id: string) => ({ __ref: `products/${id}` }) };
  if (name === "productCosts") return { doc: (id: string) => ({ __ref: `productCosts/${id}` }) };
  if (name === "stockMovements") return { doc: () => ({ __ref: "stockMovements/new" }), ...movementsQuery() };
  throw new Error(`Unexpected collection: ${name}`);
});

jest.mock("../../lib/firebaseAdmin", () => ({
  getAdminDb: () => ({
    collection: collectionMock,
    runTransaction: async <T,>(fn: (tx: unknown) => Promise<T>) =>
      fn({
        get: (target: { __ref?: string; __query?: string }) =>
          target.__query ? movementsQueryGetMock(target) : productGetMock(target),
        update: txUpdateMock,
        set: txSetMock,
      }),
  }),
}));

import { requireCaller } from "@/server/auth/requireCaller";
import { adjustStockAction, recordInitialStockAction, restockProductAction } from "@/server/actions/stockActions";
import { ForbiddenError, NotFoundError, ValidationError } from "@/server/errors";

const requireCallerMock = requireCaller as jest.Mock;

function asMember(role: string, extra: Record<string, unknown> = {}) {
  userGetMock.mockResolvedValue({ data: () => ({ role, shopId: "shop-1", displayName: "Awa", ...extra }) });
}

function productWith(data: Record<string, unknown> | null) {
  productGetMock.mockResolvedValue({ exists: !!data, data: () => data ?? undefined });
}

const movement = () => txSetMock.mock.calls.find(([ref]) => ref.__ref === "stockMovements/new")?.[1];

beforeEach(() => {
  jest.clearAllMocks();
  requireCallerMock.mockResolvedValue({ uid: "user-1" });
  asMember("seller");
  productWith({ shopId: "shop-1", name: "Wax", stock: 4 });
  movementsQueryGetMock.mockResolvedValue({ empty: true });
});

describe("restockProductAction", () => {
  it("adds the received units and records who restocked, with the note", async () => {
    const result = await restockProductAction("t", { productId: "p1", quantity: 10, note: "  Fournisseur Akwa  " });

    expect(result).toEqual({ stockAfter: 14 });
    expect(txUpdateMock).toHaveBeenCalledWith({ __ref: "products/p1" }, expect.objectContaining({ stock: 14 }));
    expect(movement()).toEqual(
      expect.objectContaining({
        shopId: "shop-1",
        productId: "p1",
        productName: "Wax",
        type: "restock",
        quantity: 10,
        stockAfter: 14,
        note: "Fournisseur Akwa",
        actorId: "user-1",
        actorName: "Awa",
      })
    );
  });

  it("lets the manager set the new purchase price at the same time", async () => {
    asMember("admin");
    await restockProductAction("t", { productId: "p1", quantity: 2, purchasePrice: 1500 });

    expect(txSetMock).toHaveBeenCalledWith(
      { __ref: "productCosts/p1" },
      expect.objectContaining({ shopId: "shop-1", purchasePrice: 1500 })
    );
  });

  it("keeps purchase prices away from sellers", async () => {
    await expect(restockProductAction("t", { productId: "p1", quantity: 2, purchasePrice: 1500 })).rejects.toThrow(
      ForbiddenError
    );
    expect(txSetMock).not.toHaveBeenCalled();
  });

  it.each([0, -3, 2.5, 2_000_000])("refuses %p units", async (quantity) => {
    await expect(restockProductAction("t", { productId: "p1", quantity })).rejects.toThrow(ValidationError);
  });

  it("refuses a client account", async () => {
    asMember("client");
    await expect(restockProductAction("t", { productId: "p1", quantity: 1 })).rejects.toThrow(ForbiddenError);
  });

  it("refuses a product from another shop, as if it didn't exist", async () => {
    productWith({ shopId: "shop-2", name: "Autre", stock: 1 });
    await expect(restockProductAction("t", { productId: "p1", quantity: 1 })).rejects.toThrow(NotFoundError);
    expect(txUpdateMock).not.toHaveBeenCalled();
  });

  it("refuses a product in the trash", async () => {
    productWith({ shopId: "shop-1", name: "Wax", stock: 1, deletedAt: {} });
    await expect(restockProductAction("t", { productId: "p1", quantity: 1 })).rejects.toThrow(ValidationError);
  });
});

describe("adjustStockAction", () => {
  it("sets the counted stock and records the gap with its reason", async () => {
    const result = await adjustStockAction("t", { productId: "p1", countedStock: 1, note: "3 pagnes abîmés" });

    expect(result).toEqual({ stockAfter: 1 });
    expect(txUpdateMock).toHaveBeenCalledWith({ __ref: "products/p1" }, expect.objectContaining({ stock: 1 }));
    expect(movement()).toEqual(
      expect.objectContaining({ type: "adjustment", quantity: -3, stockAfter: 1, note: "3 pagnes abîmés" })
    );
  });

  it("requires a reason", async () => {
    await expect(adjustStockAction("t", { productId: "p1", countedStock: 1, note: "  " })).rejects.toThrow(
      ValidationError
    );
  });

  it("says there is nothing to correct when the count matches", async () => {
    await expect(adjustStockAction("t", { productId: "p1", countedStock: 4, note: "Inventaire" })).rejects.toThrow(
      "Le stock est déjà de 4 : rien à corriger."
    );
    expect(txSetMock).not.toHaveBeenCalled();
  });

  it("refuses a negative count", async () => {
    await expect(adjustStockAction("t", { productId: "p1", countedStock: -1, note: "x" })).rejects.toThrow(
      ValidationError
    );
  });
});

describe("recordInitialStockAction", () => {
  it("records the starting stock of a new product", async () => {
    await recordInitialStockAction("t", "p1");

    expect(movementsQueryGetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: [
          ["shopId", "==", "shop-1"],
          ["productId", "==", "p1"],
        ],
      })
    );
    expect(movement()).toEqual(expect.objectContaining({ type: "initial", quantity: 4, stockAfter: 4 }));
  });

  it("does nothing once the product has a history", async () => {
    movementsQueryGetMock.mockResolvedValue({ empty: false });
    await recordInitialStockAction("t", "p1");
    expect(txSetMock).not.toHaveBeenCalled();
  });
});

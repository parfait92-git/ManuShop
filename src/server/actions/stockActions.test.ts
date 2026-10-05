jest.mock("../auth/requireCaller", () => ({ requireCaller: jest.fn() }));

jest.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    serverTimestamp: () => ({ __op: "serverTimestamp" }),
    increment: (n: number) => ({ __op: "increment", n }),
    delete: () => ({ __op: "delete" }),
  },
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
  if (name === "products")
    return {
      // Identifiant généré (`doc()` sans argument) non énumérable : les
      // comparaisons sur `{ __ref }` restent exactes.
      doc: (id?: string) => {
        const ref = { __ref: `products/${id ?? "auto"}` };
        Object.defineProperty(ref, "id", { value: id ?? `new-${++autoId}`, enumerable: false });
        return ref;
      },
    };
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
import {
  adjustStockAction,
  recordInitialStockAction,
  restockProductAction,
  saveProductVariantsAction,
} from "@/server/actions/stockActions";
import { ForbiddenError, NotFoundError, ValidationError } from "@/server/errors";

const requireCallerMock = requireCaller as jest.Mock;

function asMember(role: string, extra: Record<string, unknown> = {}) {
  userGetMock.mockResolvedValue({ data: () => ({ role, shopId: "shop-1", displayName: "Awa", ...extra }) });
}

function productWith(data: Record<string, unknown> | null) {
  productGetMock.mockResolvedValue({ exists: !!data, data: () => data ?? undefined });
}

let autoId = 0;
const movements = () => txSetMock.mock.calls.filter(([ref]) => ref.__ref === "stockMovements/new").map(([, m]) => m);
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

describe("versions (BF-17)", () => {
  const coco = {
    shopId: "shop-1",
    name: "Huile de coco",
    stock: 7,
    variants: {
      v250: { label: "250 ml", stock: 5, position: 0 },
      v500: { label: "500 ml", stock: 2, price: 5500, position: 1 },
    },
  };
  beforeEach(() => {
    autoId = 0;
    productWith(coco);
  });

  it("restocks the chosen version, keeping the product total in step", async () => {
    expect(await restockProductAction("t", { productId: "p1", variantId: "v500", quantity: 4 })).toEqual({ stockAfter: 6 });
    expect(txUpdateMock).toHaveBeenCalledWith(
      { __ref: "products/p1" },
      expect.objectContaining({ stock: 11, "variants.v500.stock": { __op: "increment", n: 4 } })
    );
    expect(movement()).toEqual(
      expect.objectContaining({ productName: "Huile de coco — 500 ml", variantId: "v500", variantLabel: "500 ml", quantity: 4, stockAfter: 6 })
    );
  });

  it("corrects the stock of one version", async () => {
    expect(await adjustStockAction("t", { productId: "p1", variantId: "v250", countedStock: 3, note: "Casse" })).toEqual({ stockAfter: 3 });
    expect(txUpdateMock).toHaveBeenCalledWith(
      { __ref: "products/p1" },
      expect.objectContaining({ stock: 5, "variants.v250.stock": { __op: "increment", n: -2 } })
    );
  });

  it("asks which version when the product has some", async () => {
    await expect(restockProductAction("t", { productId: "p1", quantity: 1 })).rejects.toThrow("Choisissez la version concernée.");
    await expect(restockProductAction("t", { productId: "p1", variantId: "nope", quantity: 1 })).rejects.toThrow(ValidationError);
  });

  it("records the starting stock of each version of a new product", async () => {
    await recordInitialStockAction("t", "p1");
    expect(movements().map((m) => [m.productName, m.quantity])).toEqual([
      ["Huile de coco — 250 ml", 5],
      ["Huile de coco — 500 ml", 2],
    ]);
  });

  describe("saveProductVariantsAction", () => {
    it("keeps the stock of existing versions, adds new ones with their starting stock, and recomputes the total", async () => {
      await saveProductVariantsAction("t", {
        productId: "p1",
        variantName: " Contenance ",
        variants: [
          { id: "v500", label: "500 ml", price: 5000 },
          { id: "v250", label: "250 ml ", stock: 99 },
          { label: "1 l", price: 9000, stock: 3 },
        ],
      });

      expect(txUpdateMock).toHaveBeenCalledWith(
        { __ref: "products/p1" },
        expect.objectContaining({
          variantName: "Contenance",
          stock: 10,
          variants: {
            v500: { label: "500 ml", stock: 2, price: 5000, position: 0 },
            v250: { label: "250 ml", stock: 5, position: 1 },
            "new-1": { label: "1 l", stock: 3, price: 9000, position: 2 },
          },
        })
      );
      expect(movements()).toEqual([
        expect.objectContaining({ type: "initial", productName: "Huile de coco — 1 l", variantId: "new-1", quantity: 3, stockAfter: 3 }),
      ]);
    });

    it("refuses to drop a version that still has stock", async () => {
      await expect(
        saveProductVariantsAction("t", { productId: "p1", variantName: "Contenance", variants: [{ id: "v250", label: "250 ml" }] })
      ).rejects.toThrow("« 500 ml » a encore 2 en stock : corrigez son stock à 0 avant de la retirer.");
      expect(txUpdateMock).not.toHaveBeenCalled();
    });

    it("splits a single stock into versions, tracing the move", async () => {
      productWith({ shopId: "shop-1", name: "Savon", stock: 6 });
      await saveProductVariantsAction("t", {
        productId: "p2",
        variantName: "Parfum",
        variants: [
          { label: "Citron", stock: 4 },
          { label: "Karité", stock: 2 },
        ],
      });
      expect(txUpdateMock).toHaveBeenCalledWith({ __ref: "products/p2" }, expect.objectContaining({ stock: 6 }));
      expect(movements().map((m) => [m.type, m.productName, m.quantity])).toEqual([
        ["adjustment", "Savon", -6],
        ["initial", "Savon — Citron", 4],
        ["initial", "Savon — Karité", 2],
      ]);
    });

    it("validates names, prices and duplicates", async () => {
      const save = (variants: unknown[], variantName = "Taille") =>
        saveProductVariantsAction("t", { productId: "p1", variantName, variants: variants as never });
      await expect(save([{ label: "S" }], " ")).rejects.toThrow(/ce qui distingue/);
      await expect(save([{ label: "S" }, { label: "s" }])).rejects.toThrow("Deux versions portent le même nom.");
      await expect(save([{ label: " " }])).rejects.toThrow(/a un nom/);
      await expect(save([{ label: "S", price: 0 }])).rejects.toThrow(/montant positif/);
      await expect(save([{ label: "S", stock: 1.5 }])).rejects.toThrow(/nombre entier/);
    });
  });
});

import { Timestamp } from "firebase/firestore";

// Loading ProductService transitively loads ProductRepository -> "@/lib/firebase",
// which initializes the real Firebase SDK (crashes under jsdom/Node without
// `fetch`). The repository is injected below anyway, so a minimal stub
// keeps the module graph happy. See AuthService.test.ts for the same issue.
jest.mock("../lib/firebase", () => ({
  db: {},
}));

import { ProductService } from "@/services/ProductService";
import type { IProductRepository } from "@/repositories/interfaces/IProductRepository";
import type { Product } from "@/models/product/Product";

function fakeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "p1",
    shopId: "shop-1",
    name: "Ensemble Wax",
    description: "Ensemble deux pièces.",
    price: 10000,
    category: "Mode",
    images: [],
    stock: 5,
    stockThreshold: 2,
    isPromo: false,
    createdAt: Timestamp.fromDate(new Date("2020-01-01T00:00:00Z")),
    updatedAt: Timestamp.fromDate(new Date("2020-01-01T00:00:00Z")),
    ...overrides,
  };
}

describe("ProductService", () => {
  let products: jest.Mocked<IProductRepository>;
  let service: ProductService;

  beforeEach(() => {
    products = {
      getById: jest.fn(),
      listByShop: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      softDelete: jest.fn(),
      restore: jest.fn(),
    };
    service = new ProductService(products);
  });

  it("delegates listProducts/getProduct/createProduct/updateProduct/deleteProduct to the repository", async () => {
    products.listByShop.mockResolvedValue([fakeProduct()]);
    products.getById.mockResolvedValue(fakeProduct());
    products.create.mockResolvedValue(fakeProduct());

    await service.listProducts("shop-1");
    expect(products.listByShop).toHaveBeenCalledWith("shop-1");

    await service.getProduct("p1");
    expect(products.getById).toHaveBeenCalledWith("p1");

    await service.createProduct({
      shopId: "shop-1",
      name: "X",
      description: "Y",
      price: 100,
      category: "Mode",
      images: [],
      stock: 1,
      stockThreshold: 0,
      isPromo: false,
    });
    expect(products.create).toHaveBeenCalled();

    await service.updateProduct("p1", { name: "Nouveau nom" });
    expect(products.update).toHaveBeenCalledWith("p1", { name: "Nouveau nom" });

    await service.deleteProduct("p1");
    expect(products.remove).toHaveBeenCalledWith("p1");
  });

  describe("listActive", () => {
    it("excludes products moved to the trash", async () => {
      const active = fakeProduct({ id: "p1" });
      const trashed = fakeProduct({ id: "p2", deletedAt: Timestamp.now() });
      products.listByShop.mockResolvedValue([active, trashed]);

      const result = await service.listActive("shop-1");

      expect(result).toEqual([active]);
    });
  });

  describe("isVisibleToCustomers", () => {
    it("is visible when isPublished is absent (no regression for pre-existing products)", () => {
      expect(service.isVisibleToCustomers(fakeProduct())).toBe(true);
    });

    it("is visible when explicitly published", () => {
      expect(
        service.isVisibleToCustomers(fakeProduct({ isPublished: true }))
      ).toBe(true);
    });

    it("is hidden once explicitly unpublished", () => {
      expect(
        service.isVisibleToCustomers(fakeProduct({ isPublished: false }))
      ).toBe(false);
    });

    it("is hidden once trashed, even if published", () => {
      expect(
        service.isVisibleToCustomers(
          fakeProduct({ isPublished: true, deletedAt: Timestamp.now() })
        )
      ).toBe(false);
    });
  });

  describe("setPublished", () => {
    it("updates isPublished on the repository", async () => {
      await service.setPublished("p1", false);
      expect(products.update).toHaveBeenCalledWith("p1", {
        isPublished: false,
      });
    });
  });

  describe("search", () => {
    const sandals = fakeProduct({
      id: "p2",
      name: "Sandales en cuir",
      category: "Chaussures",
    });
    const bag = fakeProduct({
      id: "p3",
      name: "Sac à main artisanal",
      category: "Accessoires",
    });
    const all = [sandals, bag];

    it("returns every product for an empty term", () => {
      expect(service.search(all, "")).toEqual(all);
      expect(service.search(all, "   ")).toEqual(all);
    });

    it("matches by name, case-insensitively", () => {
      expect(service.search(all, "sandales")).toEqual([sandals]);
      expect(service.search(all, "SANDALES")).toEqual([sandals]);
    });

    it("matches by category", () => {
      expect(service.search(all, "accessoires")).toEqual([bag]);
    });

    it("returns nothing when no product matches", () => {
      expect(service.search(all, "introuvable")).toEqual([]);
    });
  });

  describe("getBadge", () => {
    it("shows the discount percentage when the product is on promo", () => {
      const product = fakeProduct({
        isPromo: true,
        price: 10000,
        promoPrice: 8000,
      });
      expect(service.getBadge(product)).toBe("-20%");
    });

    it("prioritizes the promo badge over the new-product badge", () => {
      const product = fakeProduct({
        isPromo: true,
        price: 10000,
        promoPrice: 7500,
        createdAt: Timestamp.now(),
      });
      expect(service.getBadge(product)).toBe("-25%");
    });

    it("shows 'Nouveau' for a product created within the last 14 days", () => {
      const product = fakeProduct({
        isPromo: false,
        createdAt: Timestamp.now(),
      });
      expect(service.getBadge(product)).toBe("Nouveau");
    });

    it("returns null for an older, non-promo product", () => {
      const product = fakeProduct({
        isPromo: false,
        createdAt: Timestamp.fromDate(new Date("2020-01-01T00:00:00Z")),
      });
      expect(service.getBadge(product)).toBeNull();
    });

    it("ignores an inconsistent promo (promoPrice not below price)", () => {
      const product = fakeProduct({
        isPromo: true,
        price: 10000,
        promoPrice: 10000,
        createdAt: Timestamp.fromDate(new Date("2020-01-01T00:00:00Z")),
      });
      expect(service.getBadge(product)).toBeNull();
    });
  });

  describe("getStockStatus", () => {
    it("is out-of-stock at zero", () => {
      expect(service.getStockStatus(fakeProduct({ stock: 0 }))).toBe(
        "out-of-stock"
      );
    });

    it("is low-stock at or below the threshold", () => {
      expect(
        service.getStockStatus(fakeProduct({ stock: 2, stockThreshold: 2 }))
      ).toBe("low-stock");
    });

    it("is in-stock above the threshold", () => {
      expect(
        service.getStockStatus(fakeProduct({ stock: 3, stockThreshold: 2 }))
      ).toBe("in-stock");
    });
  });
});

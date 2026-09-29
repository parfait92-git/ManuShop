const listPublishedShopsMock = jest.fn();
jest.mock("../services/ShopService", () => ({
  shopService: {
    listPublishedShops: (...args: unknown[]) => listPublishedShopsMock(...args),
  },
}));

const listProductsMock = jest.fn();
const isVisibleToCustomersMock = jest.fn();
jest.mock("../services/ProductService", () => ({
  productService: {
    listProducts: (...args: unknown[]) => listProductsMock(...args),
    isVisibleToCustomers: (...args: unknown[]) =>
      isVisibleToCustomersMock(...args),
  },
}));

const listCategoriesMock = jest.fn();
jest.mock("../services/CategoryService", () => ({
  categoryService: {
    listCategories: (...args: unknown[]) => listCategoriesMock(...args),
  },
}));

const listTagsMock = jest.fn();
jest.mock("../services/CategoryTagService", () => ({
  categoryTagService: {
    listTags: (...args: unknown[]) => listTagsMock(...args),
  },
}));

import { renderHook, waitFor } from "@testing-library/react";

import { useMarketCatalogue } from "@/hooks/useMarketCatalogue";

describe("useMarketCatalogue", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    listCategoriesMock.mockResolvedValue([]);
    listTagsMock.mockResolvedValue([]);
  });

  it("starts undefined while resolving", () => {
    listPublishedShopsMock.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useMarketCatalogue());
    expect(result.current).toBeUndefined();
  });

  it("flattens visible products from every published shop, attaching their shop", async () => {
    listPublishedShopsMock.mockResolvedValue([
      { id: "shop-1", name: "Boutique 1" },
      { id: "shop-2", name: "Boutique 2" },
    ]);
    listProductsMock.mockImplementation((shopId: string) =>
      Promise.resolve(
        shopId === "shop-1"
          ? [{ id: "p1", shopId: "shop-1" }]
          : [{ id: "p2", shopId: "shop-2" }, { id: "p3", shopId: "shop-2" }]
      )
    );
    isVisibleToCustomersMock.mockReturnValue(true);

    const { result } = renderHook(() => useMarketCatalogue());

    await waitFor(() => expect(result.current).toHaveLength(3));
    expect(result.current).toEqual([
      {
        product: { id: "p1", shopId: "shop-1" },
        shop: { id: "shop-1", name: "Boutique 1" },
        tag: undefined,
      },
      {
        product: { id: "p2", shopId: "shop-2" },
        shop: { id: "shop-2", name: "Boutique 2" },
        tag: undefined,
      },
      {
        product: { id: "p3", shopId: "shop-2" },
        shop: { id: "shop-2", name: "Boutique 2" },
        tag: undefined,
      },
    ]);
  });

  it("excludes products that aren't visible to customers", async () => {
    listPublishedShopsMock.mockResolvedValue([{ id: "shop-1", name: "Boutique 1" }]);
    listProductsMock.mockResolvedValue([{ id: "p1" }, { id: "p2" }]);
    isVisibleToCustomersMock.mockImplementation(
      (product: { id: string }) => product.id === "p1"
    );

    const { result } = renderHook(() => useMarketCatalogue());

    await waitFor(() => expect(result.current).toHaveLength(1));
    expect(result.current?.[0].product).toEqual({ id: "p1" });
  });

  it("returns an empty market rather than staying stuck loading when a read fails", async () => {
    listPublishedShopsMock.mockRejectedValue(new Error("Missing or insufficient permissions."));

    const { result } = renderHook(() => useMarketCatalogue());

    await waitFor(() => expect(result.current).toEqual([]));
  });

  // BF-110 : le Marché filtre par tag système, pas par nom de catégorie
  // brut (demande explicite de l'utilisateur, 2026-09-29) — donc chaque
  // produit doit porter le tag résolu de SA catégorie DANS sa boutique.
  describe("résolution du tag système (BF-109→111)", () => {
    it("attaches the tag of the product's category within its own shop", async () => {
      listPublishedShopsMock.mockResolvedValue([{ id: "shop-1", name: "Boutique 1" }]);
      listProductsMock.mockResolvedValue([
        { id: "p1", shopId: "shop-1", category: "Mode" },
      ]);
      isVisibleToCustomersMock.mockReturnValue(true);
      listCategoriesMock.mockResolvedValue([
        { id: "c1", shopId: "shop-1", name: "Mode", tagId: "tag-mode" },
      ]);
      listTagsMock.mockResolvedValue([
        { id: "tag-mode", name: "Mode", color: "#db2777" },
      ]);

      const { result } = renderHook(() => useMarketCatalogue());

      await waitFor(() =>
        expect(result.current?.[0].tag).toEqual({
          id: "tag-mode",
          name: "Mode",
          color: "#db2777",
        })
      );
    });

    it("leaves the tag undefined when the category has none chosen", async () => {
      listPublishedShopsMock.mockResolvedValue([{ id: "shop-1", name: "Boutique 1" }]);
      listProductsMock.mockResolvedValue([
        { id: "p1", shopId: "shop-1", category: "Divers" },
      ]);
      isVisibleToCustomersMock.mockReturnValue(true);
      listCategoriesMock.mockResolvedValue([
        { id: "c1", shopId: "shop-1", name: "Divers" },
      ]);
      listTagsMock.mockResolvedValue([]);

      const { result } = renderHook(() => useMarketCatalogue());

      await waitFor(() => expect(result.current).toHaveLength(1));
      expect(result.current?.[0].tag).toBeUndefined();
    });

    it("never mixes up a category name across two different shops", async () => {
      // Deux boutiques ont chacune une catégorie "Accessoires", mais un
      // tag DIFFÉRENT — la résolution doit rester scopée par boutique.
      listPublishedShopsMock.mockResolvedValue([
        { id: "shop-1", name: "Boutique 1" },
        { id: "shop-2", name: "Boutique 2" },
      ]);
      listProductsMock.mockImplementation((shopId: string) =>
        Promise.resolve([
          { id: `p-${shopId}`, shopId, category: "Accessoires" },
        ])
      );
      isVisibleToCustomersMock.mockReturnValue(true);
      listCategoriesMock.mockImplementation((shopId: string) =>
        Promise.resolve([
          {
            id: `c-${shopId}`,
            shopId,
            name: "Accessoires",
            tagId: shopId === "shop-1" ? "tag-electronique" : "tag-mode",
          },
        ])
      );
      listTagsMock.mockResolvedValue([
        { id: "tag-electronique", name: "Électronique", color: "#2563eb" },
        { id: "tag-mode", name: "Mode", color: "#db2777" },
      ]);

      const { result } = renderHook(() => useMarketCatalogue());

      await waitFor(() => expect(result.current).toHaveLength(2));
      expect(result.current?.find((item) => item.shop.id === "shop-1")?.tag?.id).toBe(
        "tag-electronique"
      );
      expect(result.current?.find((item) => item.shop.id === "shop-2")?.tag?.id).toBe(
        "tag-mode"
      );
    });
  });
});

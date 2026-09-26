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

import { renderHook, waitFor } from "@testing-library/react";

import { useMarketCatalogue } from "@/hooks/useMarketCatalogue";

describe("useMarketCatalogue", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      { product: { id: "p1", shopId: "shop-1" }, shop: { id: "shop-1", name: "Boutique 1" } },
      { product: { id: "p2", shopId: "shop-2" }, shop: { id: "shop-2", name: "Boutique 2" } },
      { product: { id: "p3", shopId: "shop-2" }, shop: { id: "shop-2", name: "Boutique 2" } },
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
});

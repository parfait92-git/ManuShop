const isDemoCatalogueForceDisabledMock = jest.fn();
jest.mock("../services/ConfigurationService", () => ({
  configurationService: {
    isDemoCatalogueForceDisabled: (...args: unknown[]) =>
      isDemoCatalogueForceDisabledMock(...args),
  },
}));

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

import { useDemoCatalogueAvailable } from "@/hooks/useDemoCatalogueAvailable";

describe("useDemoCatalogueAvailable", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isDemoCatalogueForceDisabledMock.mockResolvedValue(false);
  });

  it("starts undefined while resolving", () => {
    listPublishedShopsMock.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useDemoCatalogueAvailable());
    expect(result.current).toBeUndefined();
  });

  it("returns false immediately when the Super Admin force-disabled it, without checking inventory", async () => {
    isDemoCatalogueForceDisabledMock.mockResolvedValue(true);
    const { result } = renderHook(() => useDemoCatalogueAvailable());

    await waitFor(() => expect(result.current).toBe(false));
    expect(listPublishedShopsMock).not.toHaveBeenCalled();
  });

  it("returns true when no published shop has any visible product yet", async () => {
    listPublishedShopsMock.mockResolvedValue([{ id: "shop-1" }, { id: "shop-2" }]);
    listProductsMock.mockResolvedValue([]);
    const { result } = renderHook(() => useDemoCatalogueAvailable());

    await waitFor(() => expect(result.current).toBe(true));
  });

  it("returns false as soon as one published shop has a real visible product", async () => {
    listPublishedShopsMock.mockResolvedValue([{ id: "shop-1" }, { id: "shop-2" }]);
    listProductsMock.mockImplementation((shopId: string) =>
      Promise.resolve(shopId === "shop-2" ? [{ id: "p1" }] : [])
    );
    isVisibleToCustomersMock.mockImplementation(
      (product: { id: string }) => product.id === "p1"
    );
    const { result } = renderHook(() => useDemoCatalogueAvailable());

    await waitFor(() => expect(result.current).toBe(false));
  });

  it("returns true when shops have products but none are actually visible", async () => {
    listPublishedShopsMock.mockResolvedValue([{ id: "shop-1" }]);
    listProductsMock.mockResolvedValue([{ id: "p1" }]);
    isVisibleToCustomersMock.mockReturnValue(false);
    const { result } = renderHook(() => useDemoCatalogueAvailable());

    await waitFor(() => expect(result.current).toBe(true));
  });

  it("falls back to true (never stuck loading) when a read fails, e.g. rules not deployed yet", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("Missing or insufficient permissions.");
    isDemoCatalogueForceDisabledMock.mockRejectedValue(error);
    const { result } = renderHook(() => useDemoCatalogueAvailable());

    await waitFor(() => expect(result.current).toBe(true));
    // Sans ce log, un vrai bug (pas seulement des règles non déployées) se
    // replie silencieusement sur la démo sans laisser la moindre trace —
    // voir 04-besoins-techniques.md §31.
    expect(consoleError).toHaveBeenCalledWith(expect.any(String), error);
    consoleError.mockRestore();
  });
});

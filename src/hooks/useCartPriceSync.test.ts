const getProductMock = jest.fn();
jest.mock("../services/ProductService", () => ({
  productService: { getProduct: (...args: unknown[]) => getProductMock(...args) },
}));

import { renderHook, waitFor } from "@testing-library/react";

import { useCartStore } from "@/store/cartStore";

import { useCartPriceSync } from "./useCartPriceSync";

const DAY = 24 * 60 * 60 * 1000;

describe("useCartPriceSync", () => {
  beforeEach(() => {
    getProductMock.mockReset();
    useCartStore.setState({
      items: [
        { productId: "p1", name: "Wax", price: 4000, image: "", quantity: 2 },
        { productId: "p2", name: "Savon", price: 500, image: "", quantity: 1 },
      ],
    });
  });

  it("restores the regular price of an item added during a promo that has since ended, and reports it", async () => {
    getProductMock.mockImplementation(async (id: string) =>
      id === "p1"
        ? {
            id: "p1",
            price: 5000,
            isPromo: true,
            promoPrice: 4000,
            promoEnd: { toDate: () => new Date(Date.now() - 3 * DAY) },
          }
        : { id: "p2", price: 500, isPromo: false }
    );

    const { result } = renderHook(() => useCartPriceSync());

    await waitFor(() => expect(result.current).toEqual(["Wax"]));
    expect(useCartStore.getState().items.map((i) => i.price)).toEqual([5000, 500]);
  });

  it("leaves the cart untouched when prices haven't changed or a product can't be read", async () => {
    getProductMock.mockImplementation(async (id: string) =>
      id === "p1" ? null : { id: "p2", price: 500, isPromo: false }
    );

    const { result } = renderHook(() => useCartPriceSync());

    await waitFor(() => expect(getProductMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current).toEqual([]));
    expect(useCartStore.getState().items.map((i) => i.price)).toEqual([4000, 500]);
  });
});

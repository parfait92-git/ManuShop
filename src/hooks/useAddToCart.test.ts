import { act, renderHook } from "@testing-library/react";

import { useCartStore } from "@/store/cartStore";

import { useAddToCart } from "./useAddToCart";

const item = (productId: string, shopId: string) => ({
  productId,
  name: productId,
  price: 1000,
  image: "",
  shopId,
});

describe("useAddToCart", () => {
  beforeEach(() => {
    useCartStore.setState({ items: [] });
    jest.restoreAllMocks();
  });

  it("adds items of the same shop without asking", () => {
    const confirmSpy = jest.spyOn(window, "confirm");
    const { result } = renderHook(() => useAddToCart());
    act(() => {
      result.current(item("a", "shop-1"));
      result.current(item("b", "shop-1"));
    });
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(useCartStore.getState().items).toHaveLength(2);
  });

  it("empties the cart for another shop's item once the client agrees — an order goes to one shop", () => {
    jest.spyOn(window, "confirm").mockReturnValue(true);
    const { result } = renderHook(() => useAddToCart());
    act(() => {
      result.current(item("a", "shop-1"));
      result.current(item("b", "shop-2"));
    });
    expect(useCartStore.getState().items.map((i) => i.productId)).toEqual(["b"]);
  });

  it("keeps the cart untouched when the client declines", () => {
    jest.spyOn(window, "confirm").mockReturnValue(false);
    const { result } = renderHook(() => useAddToCart());
    let added = true;
    act(() => {
      result.current(item("a", "shop-1"));
      added = result.current(item("b", "shop-2"));
    });
    expect(added).toBe(false);
    expect(useCartStore.getState().items.map((i) => i.productId)).toEqual(["a"]);
  });
});

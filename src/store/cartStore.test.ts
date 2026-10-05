import { act, renderHook } from "@testing-library/react";

import {
  cartItemCount,
  cartLineKey,
  cartTotal,
  useCartItemCount,
  useCartStore,
} from "./cartStore";

const shoes = { productId: "p1", name: "Sandales", price: 9500, image: "" };
const bag = { productId: "p2", name: "Sac", price: 12000, image: "" };

describe("useCartStore", () => {
  beforeEach(() => {
    useCartStore.setState({ items: [] });
    localStorage.clear();
  });

  it("adds a new item with quantity 1 by default", () => {
    useCartStore.getState().addItem(shoes);
    expect(useCartStore.getState().items).toEqual([{ ...shoes, quantity: 1 }]);
  });

  it("increments the quantity when the same product is added again", () => {
    useCartStore.getState().addItem(shoes);
    useCartStore.getState().addItem(shoes, 2);
    expect(useCartStore.getState().items).toEqual([{ ...shoes, quantity: 3 }]);
  });

  it("keeps one line per version of a product, each with its own quantity", () => {
    const small = { ...shoes, variantId: "s", variantLabel: "39" };
    const big = { ...shoes, variantId: "l", variantLabel: "42", price: 10500 };
    useCartStore.getState().addItem(small);
    useCartStore.getState().addItem(big);
    useCartStore.getState().addItem(small);
    expect(useCartStore.getState().items.map((i) => [cartLineKey(i), i.quantity])).toEqual([
      ["p1::s", 2],
      ["p1::l", 1],
    ]);

    useCartStore.getState().updateQuantity("p1::l", 3);
    useCartStore.getState().removeItem("p1::s");
    expect(useCartStore.getState().items).toEqual([{ ...big, quantity: 3 }]);
  });

  it("keeps separate line items for different products", () => {
    useCartStore.getState().addItem(shoes);
    useCartStore.getState().addItem(bag);
    expect(useCartStore.getState().items).toHaveLength(2);
  });

  it("removeItem drops the matching line", () => {
    useCartStore.getState().addItem(shoes);
    useCartStore.getState().addItem(bag);
    useCartStore.getState().removeItem("p1");
    expect(useCartStore.getState().items).toEqual([{ ...bag, quantity: 1 }]);
  });

  it("updateQuantity changes the quantity", () => {
    useCartStore.getState().addItem(shoes);
    useCartStore.getState().updateQuantity("p1", 5);
    expect(useCartStore.getState().items[0].quantity).toBe(5);
  });

  it("updateQuantity removes the item when quantity drops to 0 or below", () => {
    useCartStore.getState().addItem(shoes);
    useCartStore.getState().updateQuantity("p1", 0);
    expect(useCartStore.getState().items).toEqual([]);
  });

  it("clear empties the cart", () => {
    useCartStore.getState().addItem(shoes);
    useCartStore.getState().addItem(bag);
    useCartStore.getState().clear();
    expect(useCartStore.getState().items).toEqual([]);
  });

  it("caps the quantity to the known stock when adding a new item", () => {
    useCartStore.getState().addItem({ ...shoes, stock: 3 }, 5);
    expect(useCartStore.getState().items[0].quantity).toBe(3);
  });

  it("caps the total quantity to stock when adding more of an item already in the cart", () => {
    useCartStore.getState().addItem({ ...shoes, stock: 3 }, 2);
    useCartStore.getState().addItem({ ...shoes, stock: 3 }, 5);
    expect(useCartStore.getState().items[0].quantity).toBe(3);
  });

  it("caps updateQuantity to the item's known stock", () => {
    useCartStore.getState().addItem({ ...shoes, stock: 3 });
    useCartStore.getState().updateQuantity("p1", 10);
    expect(useCartStore.getState().items[0].quantity).toBe(3);
  });

  it("does not cap the quantity when no stock is known (item added before this field existed)", () => {
    useCartStore.getState().addItem(shoes, 999);
    expect(useCartStore.getState().items[0].quantity).toBe(999);
  });
});

describe("cartItemCount / cartTotal", () => {
  it("sums quantities and line totals", () => {
    const items = [
      { ...shoes, quantity: 2 },
      { ...bag, quantity: 1 },
    ];
    expect(cartItemCount(items)).toBe(3);
    expect(cartTotal(items)).toBe(9500 * 2 + 12000);
  });

  it("returns 0 for an empty cart", () => {
    expect(cartItemCount([])).toBe(0);
    expect(cartTotal([])).toBe(0);
  });
});

describe("useCartItemCount", () => {
  beforeEach(() => {
    useCartStore.setState({ items: [] });
  });

  it("returns 0 on the very first render, matching SSR, even with a non-empty cart", () => {
    useCartStore.getState().addItem(shoes, 4);
    const { result } = renderHook(() => useCartItemCount());
    expect(result.current).toBe(0);
  });

  it("reflects the real count once mounted", async () => {
    useCartStore.getState().addItem(shoes, 4);
    const { result } = renderHook(() => useCartItemCount());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current).toBe(4);
  });
});

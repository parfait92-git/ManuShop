import { fireEvent, render, screen } from "@testing-library/react";

import { CartPanel } from "@/components/storefront/CartPanel";
import { useCartStore } from "@/store/cartStore";

jest.mock("../../hooks/useShop", () => ({
  useShop: () => ({ shop: { id: "shop-1", whatsapp: "+237600000000", name: "Boutique" }, loading: false }),
}));

describe("CartPanel", () => {
  beforeEach(() => {
    useCartStore.setState({ items: [] });
  });

  it("shows an empty message when the cart has nothing in it", () => {
    render(<CartPanel onClose={jest.fn()} />);
    expect(screen.getByText("Votre panier est vide.")).toBeInTheDocument();
  });

  it("increments the quantity via the + button", () => {
    useCartStore.getState().addItem({ productId: "p1", name: "Sac", price: 1000, image: "" }, 1);
    render(<CartPanel onClose={jest.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Augmenter la quantité" }));

    expect(useCartStore.getState().items[0].quantity).toBe(2);
  });

  it("disables the + button and shows a hint once stock is fully in the cart", () => {
    useCartStore.getState().addItem(
      { productId: "p1", name: "Sac", price: 1000, image: "", stock: 3 },
      3
    );
    render(<CartPanel onClose={jest.fn()} />);

    const increaseButton = screen.getByRole("button", { name: "Augmenter la quantité" });
    expect(increaseButton).toBeDisabled();
    expect(
      screen.getByText("Stock maximum atteint (3 disponibles).")
    ).toBeInTheDocument();
  });

  it("does not show a stock hint when no stock is known for the item", () => {
    useCartStore.getState().addItem({ productId: "p1", name: "Sac", price: 1000, image: "" }, 5);
    render(<CartPanel onClose={jest.fn()} />);

    expect(
      screen.getByRole("button", { name: "Augmenter la quantité" })
    ).toBeEnabled();
    expect(screen.queryByText(/Stock maximum atteint/)).not.toBeInTheDocument();
  });

  it("removes an item from the cart", () => {
    useCartStore.getState().addItem({ productId: "p1", name: "Sac", price: 1000, image: "" }, 1);
    render(<CartPanel onClose={jest.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Retirer Sac" }));

    expect(useCartStore.getState().items).toEqual([]);
  });
});

jest.mock("../../lib/firebase", () => ({ db: {}, auth: {} }));

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StorefrontProductCard } from "@/components/storefront/StorefrontProductCard";
import type { Product } from "@/models/product/Product";

function fakeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "p1",
    shopId: "shop-1",
    name: "Sac à main artisanal",
    description: "",
    price: 12500,
    category: "Accessoires",
    images: ["https://picsum.photos/seed/p1/400/400"],
    stock: 10,
    stockThreshold: 2,
    isPromo: false,
    createdAt: { toDate: () => new Date("2020-01-01") } as never,
    updatedAt: { toDate: () => new Date("2020-01-01") } as never,
    ...overrides,
  };
}

describe("StorefrontProductCard", () => {
  it("links to the product detail page", () => {
    render(<StorefrontProductCard product={fakeProduct()} />);

    expect(
      screen.getByRole("link", { name: /Sac à main artisanal/ })
    ).toHaveAttribute("href", "/catalogue/p1");
  });

  it("toggles the favorite button without navigating (not nested in the link)", async () => {
    const user = userEvent.setup();
    render(<StorefrontProductCard product={fakeProduct()} />);

    const favoriteButton = screen.getByRole("button", {
      name: "Ajouter aux favoris",
    });
    // Un <button> ne peut pas être un descendant d'un <a> en HTML valide.
    expect(favoriteButton.closest("a")).toBeNull();

    await user.click(favoriteButton);
    expect(
      screen.getByRole("button", { name: "Retirer des favoris" })
    ).toBeInTheDocument();
  });

  it("keeps the add-to-cart button outside the link too", () => {
    render(<StorefrontProductCard product={fakeProduct()} />);

    const addButton = screen.getByRole("button", { name: "Ajouter au panier" });
    expect(addButton.closest("a")).toBeNull();
  });
});

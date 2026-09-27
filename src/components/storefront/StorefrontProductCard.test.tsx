jest.mock("../../lib/firebase", () => ({ db: {}, auth: {} }));

const useAuthMock = jest.fn();
jest.mock("../providers/AuthProvider", () => ({
  useAuth: (...args: unknown[]) => useAuthMock(...args),
}));

const toastErrorMock = jest.fn();
jest.mock("sonner", () => ({ toast: { error: (...args: unknown[]) => toastErrorMock(...args) } }));

import { fireEvent, render, screen } from "@testing-library/react";

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

const toggleFavoriteMock = jest.fn();

describe("StorefrontProductCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthMock.mockReturnValue({
      firebaseUser: { uid: "u1" },
      profile: { favoriteProductIds: [] },
      toggleFavorite: toggleFavoriteMock,
    });
  });

  it("links to the product detail page", () => {
    render(<StorefrontProductCard product={fakeProduct()} />);

    expect(
      screen.getByRole("link", { name: /Sac à main artisanal/ })
    ).toHaveAttribute("href", "/catalogue/p1");
  });

  it("zooms the product image on hover/focus of the card", () => {
    render(<StorefrontProductCard product={fakeProduct()} />);

    const link = screen.getByRole("link", { name: /Sac à main artisanal/ });
    expect(link).toHaveClass("group");
    expect(screen.getByRole("img")).toHaveClass(
      "transition-transform",
      "group-hover:scale-110",
      "group-focus-visible:scale-110"
    );
  });

  it("toggles a signed-in visitor's favorite (BF-129), without navigating", () => {
    render(<StorefrontProductCard product={fakeProduct()} />);

    const favoriteButton = screen.getByRole("button", {
      name: "Ajouter aux favoris",
    });
    // Un <button> ne peut pas être un descendant d'un <a> en HTML valide.
    expect(favoriteButton.closest("a")).toBeNull();

    fireEvent.click(favoriteButton);
    expect(toggleFavoriteMock).toHaveBeenCalledWith("p1");
  });

  it("reflects the profile's real favorites, not local-only state", () => {
    useAuthMock.mockReturnValue({
      firebaseUser: { uid: "u1" },
      profile: { favoriteProductIds: ["p1"] },
      toggleFavorite: toggleFavoriteMock,
    });
    render(<StorefrontProductCard product={fakeProduct()} />);

    expect(
      screen.getByRole("button", { name: "Retirer des favoris" })
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("prompts a guest to sign in instead of toggling anything", () => {
    useAuthMock.mockReturnValue({
      firebaseUser: null,
      profile: null,
      toggleFavorite: toggleFavoriteMock,
    });
    render(<StorefrontProductCard product={fakeProduct()} />);

    fireEvent.click(screen.getByRole("button", { name: "Ajouter aux favoris" }));

    expect(toggleFavoriteMock).not.toHaveBeenCalled();
    expect(toastErrorMock).toHaveBeenCalled();
  });

  it("keeps the add-to-cart button outside the link too", () => {
    render(<StorefrontProductCard product={fakeProduct()} />);

    const addButton = screen.getByRole("button", { name: "Ajouter au panier" });
    expect(addButton.closest("a")).toBeNull();
  });

  it("shows a shop attribution link when a shop is provided (multi-shop catalogue)", () => {
    render(
      <StorefrontProductCard
        product={fakeProduct()}
        shop={{
          id: "shop-1",
          name: "Boutique Test",
          logo: "",
          address: "",
          phone: "",
          whatsapp: "",
          currency: "XAF",
          ownerId: "u1",
          createdAt: { toDate: () => new Date("2020-01-01") } as never,
        }}
      />
    );

    const shopLink = screen.getByRole("link", { name: "Boutique Test" });
    expect(shopLink).toHaveAttribute("href", "/boutique/shop-1");
    // Deux <a> imbriqués seraient invalides en HTML.
    expect(shopLink.closest('a[href="/catalogue/p1"]')).toBeNull();
  });

  it("has no shop attribution when no shop is provided (single-shop pages)", () => {
    render(<StorefrontProductCard product={fakeProduct()} />);
    expect(screen.queryByRole("link", { name: /boutique/i })).not.toBeInTheDocument();
  });

  it("uses a custom shopHref when provided (demo catalogue, BF-125)", () => {
    render(
      <StorefrontProductCard
        product={fakeProduct()}
        shop={{
          id: "shop-1",
          name: "Boutique Test",
          logo: "",
          address: "",
          phone: "",
          whatsapp: "",
          currency: "XAF",
          ownerId: "u1",
          createdAt: { toDate: () => new Date("2020-01-01") } as never,
        }}
        shopHref="/demo-catalogue/boutique/shop-1"
      />
    );

    expect(screen.getByRole("link", { name: "Boutique Test" })).toHaveAttribute(
      "href",
      "/demo-catalogue/boutique/shop-1"
    );
  });
});

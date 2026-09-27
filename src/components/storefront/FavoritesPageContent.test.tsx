const useAuthMock = jest.fn();
jest.mock("../providers/AuthProvider", () => ({
  useAuth: (...args: unknown[]) => useAuthMock(...args),
}));

const getProductMock = jest.fn();
jest.mock("../../services/ProductService", () => ({
  productService: { getProduct: (...args: unknown[]) => getProductMock(...args) },
}));

const getShopMock = jest.fn();
jest.mock("../../services/ShopService", () => ({
  shopService: { getShop: (...args: unknown[]) => getShopMock(...args) },
}));

jest.mock("./StorefrontProductCard", () => ({
  StorefrontProductCard: ({
    product,
    shop,
  }: {
    product: { id: string; name: string };
    shop?: { name: string };
  }) => (
    <div data-testid={`product-${product.id}`}>
      {product.name} — {shop?.name}
    </div>
  ),
}));

import { render, screen } from "@testing-library/react";

import { FavoritesPageContent } from "./FavoritesPageContent";

function fakeProduct(id: string, name: string, shopId = "shop-1") {
  return { id, name, shopId };
}

describe("FavoritesPageContent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows a loading state while resolving", () => {
    useAuthMock.mockReturnValue({
      firebaseUser: { uid: "u1" },
      profile: { favoriteProductIds: ["p1"] },
    });
    getProductMock.mockReturnValue(new Promise(() => {}));
    render(<FavoritesPageContent />);
    expect(screen.getByText("Chargement...")).toBeInTheDocument();
  });

  it("shows an honest empty state when there are no favorites", async () => {
    useAuthMock.mockReturnValue({
      firebaseUser: { uid: "u1" },
      profile: { favoriteProductIds: [] },
    });
    render(<FavoritesPageContent />);

    expect(
      await screen.findByText("Vous n'avez encore aucun favori.")
    ).toBeInTheDocument();
  });

  it("loads each favorited product with its shop", async () => {
    useAuthMock.mockReturnValue({
      firebaseUser: { uid: "u1" },
      profile: { favoriteProductIds: ["p1", "p2"] },
    });
    getProductMock.mockImplementation((id: string) =>
      Promise.resolve(
        id === "p1" ? fakeProduct("p1", "Sac") : fakeProduct("p2", "Chaussures", "shop-2")
      )
    );
    getShopMock.mockImplementation((shopId: string) =>
      Promise.resolve({ id: shopId, name: shopId === "shop-1" ? "Boutique A" : "Boutique B" })
    );

    render(<FavoritesPageContent />);

    expect(await screen.findByTestId("product-p1")).toHaveTextContent("Sac — Boutique A");
    expect(screen.getByTestId("product-p2")).toHaveTextContent("Chaussures — Boutique B");
  });

  it("skips a favorite whose product was deleted since", async () => {
    useAuthMock.mockReturnValue({
      firebaseUser: { uid: "u1" },
      profile: { favoriteProductIds: ["p1", "gone"] },
    });
    getProductMock.mockImplementation((id: string) =>
      Promise.resolve(id === "p1" ? fakeProduct("p1", "Sac") : null)
    );
    getShopMock.mockResolvedValue({ id: "shop-1", name: "Boutique A" });

    render(<FavoritesPageContent />);

    expect(await screen.findByTestId("product-p1")).toBeInTheDocument();
    expect(screen.queryByTestId("product-gone")).not.toBeInTheDocument();
  });

  it("falls back to an empty list rather than hanging when a read fails", async () => {
    useAuthMock.mockReturnValue({
      firebaseUser: { uid: "u1" },
      profile: { favoriteProductIds: ["p1"] },
    });
    getProductMock.mockRejectedValue(new Error("network"));

    render(<FavoritesPageContent />);

    expect(
      await screen.findByText("Vous n'avez encore aucun favori.")
    ).toBeInTheDocument();
  });
});

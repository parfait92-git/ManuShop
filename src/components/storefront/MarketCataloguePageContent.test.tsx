const useMarketCatalogueMock = jest.fn();
jest.mock("../../hooks/useMarketCatalogue", () => ({
  useMarketCatalogue: () => useMarketCatalogueMock(),
}));

jest.mock("../../lib/firebase", () => ({ db: {}, auth: {} }));

// `StorefrontProductCard` (rendu à l'intérieur) appelle `useAuth()` pour
// son bouton favoris (BF-129) — mocké directement plutôt que de laisser
// `AuthProvider` charger `AuthService`/`firebase/auth` pour de vrai, qui
// plante sous jsdom (pas de `fetch` global, voir les autres tests de ce
// projet pour le même contournement).
jest.mock("../providers/AuthProvider", () => ({
  useAuth: () => ({
    firebaseUser: null,
    profile: null,
    toggleFavorite: jest.fn(),
  }),
}));

import { fireEvent, render, screen, within } from "@testing-library/react";

import { MarketCataloguePageContent } from "./MarketCataloguePageContent";

function fakeTimestamp(ms: number) {
  return { toDate: () => new Date(ms) } as never;
}

function marketItem(overrides: {
  id: string;
  shopId: string;
  shopName: string;
  name?: string;
  category?: string;
  price?: number;
  isPromo?: boolean;
  createdAtMs?: number;
}) {
  return {
    product: {
      id: overrides.id,
      shopId: overrides.shopId,
      name: overrides.name ?? "Produit",
      description: "",
      price: overrides.price ?? 10000,
      category: overrides.category ?? "Mode",
      images: [],
      stock: 5,
      stockThreshold: 1,
      isPromo: overrides.isPromo ?? false,
      createdAt: fakeTimestamp(overrides.createdAtMs ?? 0),
      updatedAt: fakeTimestamp(overrides.createdAtMs ?? 0),
    },
    shop: { id: overrides.shopId, name: overrides.shopName, logo: "" },
  };
}

describe("MarketCataloguePageContent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows a loading state while the market resolves", () => {
    useMarketCatalogueMock.mockReturnValue(undefined);
    render(<MarketCataloguePageContent />);
    expect(screen.getByText("Chargement...")).toBeInTheDocument();
  });

  it("shows an honest empty state when no shop has any visible product", () => {
    useMarketCatalogueMock.mockReturnValue([]);
    render(<MarketCataloguePageContent />);
    expect(
      screen.getByText("Aucun produit disponible pour le moment.")
    ).toBeInTheDocument();
  });

  it("lists products from every shop, attributing each card to its shop", () => {
    useMarketCatalogueMock.mockReturnValue([
      marketItem({ id: "p1", shopId: "shop-1", shopName: "Boutique A", name: "Sac" }),
      marketItem({ id: "p2", shopId: "shop-2", shopName: "Boutique B", name: "Chaussures" }),
    ]);
    render(<MarketCataloguePageContent />);

    expect(screen.getByText("Sac")).toBeInTheDocument();
    expect(screen.getByText("Chaussures")).toBeInTheDocument();
    // "Boutique A"/"B" apparaissent deux fois chacune : dans le mini-bloc
    // "Boutiques" et dans l'attribution de chaque carte produit.
    expect(screen.getAllByText("Boutique A")).toHaveLength(2);
    expect(screen.getAllByText("Boutique B")).toHaveLength(2);
    expect(screen.getByText("2 articles disponibles")).toBeInTheDocument();
  });

  it("shows a deduplicated 'Boutiques' block with a link to see all shops", () => {
    useMarketCatalogueMock.mockReturnValue([
      marketItem({ id: "p1", shopId: "shop-1", shopName: "Boutique A", name: "Sac" }),
      marketItem({ id: "p2", shopId: "shop-1", shopName: "Boutique A", name: "Chapeau" }),
      marketItem({ id: "p3", shopId: "shop-2", shopName: "Boutique B", name: "Chaussures" }),
    ]);
    render(<MarketCataloguePageContent />);

    // Une seule carte "Boutiques" pour shop-1 malgré ses 2 produits.
    const shopsSection = screen.getByRole("heading", { name: "Boutiques" }).closest("section")!;
    expect(within(shopsSection).getAllByRole("link", { name: "Boutique A" })).toHaveLength(1);
    expect(within(shopsSection).getAllByRole("link", { name: "Boutique B" })).toHaveLength(1);

    const seeAllLink = screen.getByRole("link", { name: /Voir toutes les boutiques/ });
    expect(seeAllLink).toHaveAttribute("href", "/boutiques");
  });

  it("does not show the 'Boutiques' block when the market is empty", () => {
    useMarketCatalogueMock.mockReturnValue([]);
    render(<MarketCataloguePageContent />);
    expect(
      screen.queryByRole("link", { name: /Voir toutes les boutiques/ })
    ).not.toBeInTheDocument();
  });

  it("filters by category across shops", () => {
    useMarketCatalogueMock.mockReturnValue([
      marketItem({ id: "p1", shopId: "shop-1", shopName: "A", name: "Sac", category: "Mode" }),
      marketItem({ id: "p2", shopId: "shop-2", shopName: "B", name: "Casque", category: "Électronique" }),
    ]);
    render(<MarketCataloguePageContent />);

    fireEvent.click(screen.getByRole("button", { name: "Électronique" }));

    expect(screen.getByText("Casque")).toBeInTheDocument();
    expect(screen.queryByText("Sac")).not.toBeInTheDocument();
  });

  it("searches by product name across shops", () => {
    useMarketCatalogueMock.mockReturnValue([
      marketItem({ id: "p1", shopId: "shop-1", shopName: "A", name: "Sac en cuir" }),
      marketItem({ id: "p2", shopId: "shop-2", shopName: "B", name: "Casque audio" }),
    ]);
    render(<MarketCataloguePageContent />);

    fireEvent.change(screen.getByLabelText("Rechercher un article"), {
      target: { value: "casque" },
    });

    expect(screen.getByText("Casque audio")).toBeInTheDocument();
    expect(screen.queryByText("Sac en cuir")).not.toBeInTheDocument();
  });

  it("shows a dedicated message when a search matches nothing", () => {
    useMarketCatalogueMock.mockReturnValue([
      marketItem({ id: "p1", shopId: "shop-1", shopName: "A", name: "Sac" }),
    ]);
    render(<MarketCataloguePageContent />);

    fireEvent.change(screen.getByLabelText("Rechercher un article"), {
      target: { value: "introuvable" },
    });

    expect(
      screen.getByText("Aucun produit ne correspond à votre recherche.")
    ).toBeInTheDocument();
  });

  it("sorts by price ascending across shops", () => {
    useMarketCatalogueMock.mockReturnValue([
      marketItem({ id: "p1", shopId: "shop-1", shopName: "A", name: "Cher", price: 20000 }),
      marketItem({ id: "p2", shopId: "shop-2", shopName: "B", name: "Pas cher", price: 5000 }),
    ]);
    render(<MarketCataloguePageContent />);

    fireEvent.change(screen.getByLabelText("Trier par"), {
      target: { value: "price-asc" },
    });

    const names = screen.getAllByRole("heading", { level: 3 }).map((el) => el.textContent);
    expect(names).toEqual(["Pas cher", "Cher"]);
  });
});

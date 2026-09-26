jest.mock("../../lib/firebase", () => ({ db: {}, auth: {} }));

const useDemoCatalogueAvailableMock = jest.fn();
jest.mock("../../hooks/useDemoCatalogueAvailable", () => ({
  useDemoCatalogueAvailable: () => useDemoCatalogueAvailableMock(),
}));

const useMarketCatalogueMock = jest.fn();
jest.mock("../../hooks/useMarketCatalogue", () => ({
  useMarketCatalogue: () => useMarketCatalogueMock(),
}));

import { render, screen } from "@testing-library/react";

import { FeaturedShowcase } from "./FeaturedShowcase";

describe("FeaturedShowcase", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders nothing while demo availability is still resolving", () => {
    useDemoCatalogueAvailableMock.mockReturnValue(undefined);
    useMarketCatalogueMock.mockReturnValue(undefined);
    const { container } = render(<FeaturedShowcase />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows demo products (with the fabricated stat) when no real shop has inventory yet", () => {
    useDemoCatalogueAvailableMock.mockReturnValue(true);
    useMarketCatalogueMock.mockReturnValue(undefined);
    render(<FeaturedShowcase />);

    // Powerbank 10000mAh (TechPoint, en promo) est en tête du classement de
    // démo — voir src/data/mockData.ts.
    expect(screen.getByText("Powerbank 10000mAh")).toBeInTheDocument();
    expect(screen.getByText("+120% de commandes ce mois")).toBeInTheDocument();
  });

  it("renders nothing while the real market catalogue is still resolving", () => {
    useDemoCatalogueAvailableMock.mockReturnValue(false);
    useMarketCatalogueMock.mockReturnValue(undefined);
    const { container } = render(<FeaturedShowcase />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the top real product per shop, without the fabricated stat", () => {
    useDemoCatalogueAvailableMock.mockReturnValue(false);
    useMarketCatalogueMock.mockReturnValue([
      {
        product: {
          id: "p1",
          name: "Sac en cuir",
          category: "Mode",
          price: 15000,
          isPromo: false,
          images: [],
          createdAt: { toMillis: () => 1000 },
        },
        shop: { id: "shop-a", name: "Boutique A" },
      },
      {
        product: {
          id: "p2",
          name: "Robe wax",
          category: "Mode",
          price: 20000,
          isPromo: true,
          promoPrice: 12000,
          images: [],
          createdAt: { toMillis: () => 500 },
        },
        shop: { id: "shop-a", name: "Boutique A" },
      },
      {
        product: {
          id: "p3",
          name: "Casque audio",
          category: "Électronique",
          price: 30000,
          isPromo: false,
          images: [],
          createdAt: { toMillis: () => 2000 },
        },
        shop: { id: "shop-b", name: "Boutique B" },
      },
    ]);
    render(<FeaturedShowcase />);

    // "Robe wax" (promo) bat "Sac en cuir" pour la même boutique A.
    expect(screen.getByText("Robe wax")).toBeInTheDocument();
    expect(screen.queryByText("Sac en cuir")).not.toBeInTheDocument();
    expect(screen.getByText("Casque audio")).toBeInTheDocument();
    expect(screen.queryByText("+120% de commandes ce mois")).not.toBeInTheDocument();
  });

  it("renders nothing when the platform has no real shop and demo was force-disabled", () => {
    useDemoCatalogueAvailableMock.mockReturnValue(false);
    useMarketCatalogueMock.mockReturnValue([]);
    const { container } = render(<FeaturedShowcase />);
    expect(container).toBeEmptyDOMElement();
  });
});

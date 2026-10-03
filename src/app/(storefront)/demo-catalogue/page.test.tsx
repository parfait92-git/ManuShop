// La visite guidée (BF-134) charge le SDK Firebase via useAuth — hors sujet ici.
jest.mock("../../../components/onboarding/PageTour", () => ({ PageTour: () => null }));

jest.mock("../../../lib/firebase", () => ({ db: {}, auth: {} }));

const replaceMock = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

const useDemoCatalogueAvailableMock = jest.fn();
jest.mock("../../../hooks/useDemoCatalogueAvailable", () => ({
  useDemoCatalogueAvailable: () => useDemoCatalogueAvailableMock(),
}));

// `StorefrontProductCard` (rendu à l'intérieur) appelle `useAuth()` pour
// son bouton favoris (BF-129) — voir MarketCataloguePageContent.test.tsx
// pour la même raison de mocker directement plutôt que de laisser
// `AuthProvider` charger `firebase/auth` pour de vrai sous jsdom.
jest.mock("../../../components/providers/AuthProvider", () => ({
  useAuth: () => ({
    firebaseUser: null,
    profile: null,
    toggleFavorite: jest.fn(),
  }),
}));

import { render, screen, within } from "@testing-library/react";

import { mockShops } from "@/data/mockData";

import DemoCataloguePage from "./page";

describe("DemoCataloguePage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useDemoCatalogueAvailableMock.mockReturnValue(true);
  });

  it("shows a loading state while availability is still resolving", () => {
    useDemoCatalogueAvailableMock.mockReturnValue(undefined);
    render(<DemoCataloguePage />);

    expect(screen.getByText("Chargement...")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("redirects to /catalogue once the demo is no longer available", () => {
    useDemoCatalogueAvailableMock.mockReturnValue(false);
    render(<DemoCataloguePage />);

    expect(replaceMock).toHaveBeenCalledWith("/catalogue");
  });

  it("renders the demo heading and a mixed grid of every shop's products", () => {
    render(<DemoCataloguePage />);

    expect(replaceMock).not.toHaveBeenCalled();
    expect(
      screen.getByText("Le catalogue multi-boutiques de ManuShop")
    ).toBeInTheDocument();
    // Simule le comportement réel de /catalogue (BF-125) : produits
    // mélangés, plus de sections par boutique avec ancres #shopId.
    const productLinks = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href")?.startsWith("/catalogue/"));
    expect(productLinks.length).toBeGreaterThan(1);
  });

  it("shows a 'Boutiques' block pointing to the demo all-shops page, not the real one", () => {
    render(<DemoCataloguePage />);

    const seeAllLink = screen.getByRole("link", { name: /Voir toutes les boutiques/ });
    expect(seeAllLink).toHaveAttribute("href", "/demo-catalogue/boutiques");

    const [firstShop] = mockShops;
    const shopsSection = screen.getByRole("heading", { name: "Boutiques" }).closest("section")!;
    expect(
      within(shopsSection).getByRole("link", { name: new RegExp(firstShop.name) })
    ).toHaveAttribute("href", `/demo-catalogue/boutique/${firstShop.id}`);
  });

  it("attributes each product card to its demo shop's own page, not the real /boutique route", () => {
    render(<DemoCataloguePage />);

    const [firstShop] = mockShops;
    const shopAttributionLinks = screen
      .getAllByRole("link", { name: new RegExp(firstShop.name) })
      .filter((link) => link.getAttribute("href")?.startsWith("/demo-catalogue/boutique/"));
    expect(shopAttributionLinks.length).toBeGreaterThan(0);
    for (const link of shopAttributionLinks) {
      expect(link).toHaveAttribute("href", `/demo-catalogue/boutique/${firstShop.id}`);
    }
  });
});

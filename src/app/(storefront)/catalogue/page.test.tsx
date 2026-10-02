// La visite guidée (BF-134) charge le SDK Firebase via useAuth — hors sujet ici.
jest.mock("../../../components/onboarding/PageTour", () => ({ PageTour: () => null }));

const replaceMock = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

const useDemoCatalogueAvailableMock = jest.fn();
jest.mock("../../../hooks/useDemoCatalogueAvailable", () => ({
  useDemoCatalogueAvailable: () => useDemoCatalogueAvailableMock(),
}));

jest.mock("../../../components/storefront/MarketCataloguePageContent", () => ({
  MarketCataloguePageContent: () => <div data-testid="market-catalogue-content" />,
}));

import { render, screen } from "@testing-library/react";

import CataloguePage from "./page";

describe("CataloguePage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows a loading state while demo catalogue availability is still resolving", () => {
    useDemoCatalogueAvailableMock.mockReturnValue(undefined);
    render(<CataloguePage />);

    expect(screen.getByText("Chargement...")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("redirects to the demo catalogue when no real published shop has inventory yet", () => {
    useDemoCatalogueAvailableMock.mockReturnValue(true);
    render(<CataloguePage />);

    expect(replaceMock).toHaveBeenCalledWith("/demo-catalogue");
    expect(screen.getByText("Chargement...")).toBeInTheDocument();
  });

  it("renders the real multi-shop market catalogue once real inventory exists", () => {
    useDemoCatalogueAvailableMock.mockReturnValue(false);
    render(<CataloguePage />);

    expect(replaceMock).not.toHaveBeenCalled();
    expect(screen.getByTestId("market-catalogue-content")).toBeInTheDocument();
  });
});

// La visite guidée (BF-134) charge le SDK Firebase via useAuth — hors sujet ici.
jest.mock("../../../../components/onboarding/PageTour", () => ({ PageTour: () => null }));

const replaceMock = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

const useDemoCatalogueAvailableMock = jest.fn();
jest.mock("../../../../hooks/useDemoCatalogueAvailable", () => ({
  useDemoCatalogueAvailable: () => useDemoCatalogueAvailableMock(),
}));

import { render, screen } from "@testing-library/react";

import { mockShops } from "@/data/mockData";

import DemoAllShopsPage from "./page";

describe("DemoAllShopsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useDemoCatalogueAvailableMock.mockReturnValue(true);
  });

  it("shows a loading state while availability is still resolving", () => {
    useDemoCatalogueAvailableMock.mockReturnValue(undefined);
    render(<DemoAllShopsPage />);

    expect(screen.getByText("Chargement...")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("redirects to /catalogue once the demo is no longer available, even on direct URL access", () => {
    useDemoCatalogueAvailableMock.mockReturnValue(false);
    render(<DemoAllShopsPage />);

    expect(replaceMock).toHaveBeenCalledWith("/catalogue");
  });

  it("lists every demo shop, each linking to its own demo page", () => {
    render(<DemoAllShopsPage />);

    expect(
      screen.getByText(`${mockShops.length} boutiques de démonstration`)
    ).toBeInTheDocument();

    for (const shop of mockShops) {
      expect(
        screen.getByRole("link", { name: new RegExp(shop.name) })
      ).toHaveAttribute("href", `/demo-catalogue/boutique/${shop.id}`);
    }
  });
});

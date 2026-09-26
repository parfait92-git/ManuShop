const replaceMock = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

const useDemoCatalogueAvailableMock = jest.fn();
jest.mock("../../../hooks/useDemoCatalogueAvailable", () => ({
  useDemoCatalogueAvailable: () => useDemoCatalogueAvailableMock(),
}));

jest.mock("../../../components/storefront/StorefrontProductCard", () => ({
  StorefrontProductCard: ({ product }: { product: { id: string } }) => (
    <div data-testid="product-card">{product.id}</div>
  ),
}));

import { render, screen } from "@testing-library/react";

import DemoCataloguePage from "./page";

describe("DemoCataloguePage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it("renders the demo shops when still available", () => {
    useDemoCatalogueAvailableMock.mockReturnValue(true);
    render(<DemoCataloguePage />);

    expect(replaceMock).not.toHaveBeenCalled();
    expect(
      screen.getByText("Le catalogue multi-boutiques de ManuShop")
    ).toBeInTheDocument();
  });
});

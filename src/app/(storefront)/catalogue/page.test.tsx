const replaceMock = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

const useShopMock = jest.fn();
jest.mock("../../../hooks/useShop", () => ({ useShop: () => useShopMock() }));

const useDemoCatalogueAvailableMock = jest.fn();
jest.mock("../../../hooks/useDemoCatalogueAvailable", () => ({
  useDemoCatalogueAvailable: () => useDemoCatalogueAvailableMock(),
}));

jest.mock("../../../components/storefront/CataloguePageContent", () => ({
  CataloguePageContent: ({ shopId }: { shopId: string }) => (
    <div data-testid="catalogue-content">{shopId}</div>
  ),
}));

import { render, screen } from "@testing-library/react";

import CataloguePage from "./page";

describe("CataloguePage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useDemoCatalogueAvailableMock.mockReturnValue(true);
  });

  it("shows a loading state while the shop resolves", () => {
    useShopMock.mockReturnValue({ shop: null, loading: true });
    render(<CataloguePage />);

    expect(screen.getByText("Chargement...")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("redirects to the demo catalogue when there is no shop", () => {
    useShopMock.mockReturnValue({ shop: null, loading: false });
    render(<CataloguePage />);

    expect(replaceMock).toHaveBeenCalledWith("/demo-catalogue");
  });

  it("redirects to the demo catalogue when the shop isn't published", () => {
    useShopMock.mockReturnValue({
      shop: { id: "shop-1", isPublished: false },
      loading: false,
    });
    render(<CataloguePage />);

    expect(replaceMock).toHaveBeenCalledWith("/demo-catalogue");
  });

  it("renders the real catalogue for a published shop", () => {
    useShopMock.mockReturnValue({
      shop: { id: "shop-1", isPublished: true },
      loading: false,
    });
    render(<CataloguePage />);

    expect(replaceMock).not.toHaveBeenCalled();
    expect(screen.getByTestId("catalogue-content")).toHaveTextContent(
      "shop-1"
    );
  });

  it("shows an honest empty state instead of redirecting when the demo catalogue isn't available", () => {
    useShopMock.mockReturnValue({ shop: null, loading: false });
    useDemoCatalogueAvailableMock.mockReturnValue(false);
    render(<CataloguePage />);

    expect(replaceMock).not.toHaveBeenCalled();
    expect(
      screen.getByText("Aucune boutique disponible pour le moment.")
    ).toBeInTheDocument();
  });

  it("shows a loading state while demo catalogue availability is still resolving", () => {
    useShopMock.mockReturnValue({ shop: null, loading: false });
    useDemoCatalogueAvailableMock.mockReturnValue(undefined);
    render(<CataloguePage />);

    expect(replaceMock).not.toHaveBeenCalled();
    expect(screen.getByText("Chargement...")).toBeInTheDocument();
  });
});

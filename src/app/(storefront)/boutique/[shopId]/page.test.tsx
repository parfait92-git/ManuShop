jest.mock("next/navigation", () => ({
  useParams: () => ({ shopId: "shop-1" }),
}));

const getShopMock = jest.fn();
jest.mock("../../../../services/ShopService", () => ({
  shopService: { getShop: (...args: unknown[]) => getShopMock(...args) },
}));

jest.mock("../../../../components/storefront/CataloguePageContent", () => ({
  CataloguePageContent: ({ shopId }: { shopId: string }) => (
    <div data-testid="catalogue-content">{shopId}</div>
  ),
}));

import { render, screen } from "@testing-library/react";

import ShopStorefrontPage from "./page";

describe("ShopStorefrontPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows a loading state while the shop resolves", () => {
    getShopMock.mockReturnValue(new Promise(() => {}));
    render(<ShopStorefrontPage />);
    expect(screen.getByText("Chargement...")).toBeInTheDocument();
  });

  it("shows a not-found message when the shop doesn't exist", async () => {
    getShopMock.mockResolvedValue(null);
    render(<ShopStorefrontPage />);

    expect(
      await screen.findByText("Boutique introuvable ou non publiée.")
    ).toBeInTheDocument();
    expect(getShopMock).toHaveBeenCalledWith("shop-1");
  });

  it("shows a not-found message when the shop exists but isn't published", async () => {
    getShopMock.mockResolvedValue({ id: "shop-1", isPublished: false });
    render(<ShopStorefrontPage />);

    expect(
      await screen.findByText("Boutique introuvable ou non publiée.")
    ).toBeInTheDocument();
  });

  it("renders the shop's catalogue when published", async () => {
    getShopMock.mockResolvedValue({ id: "shop-1", isPublished: true });
    render(<ShopStorefrontPage />);

    expect(await screen.findByTestId("catalogue-content")).toHaveTextContent(
      "shop-1"
    );
  });
});

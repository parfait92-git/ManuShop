// La visite guidée (BF-134) charge le SDK Firebase via useAuth — hors sujet ici.
jest.mock("../../../../../components/onboarding/PageTour", () => ({ PageTour: () => null }));

const replaceMock = jest.fn();
let paramsShopId = "shop-techpoint";
jest.mock("next/navigation", () => ({
  useParams: () => ({ shopId: paramsShopId }),
  useRouter: () => ({ replace: replaceMock }),
}));

const useDemoCatalogueAvailableMock = jest.fn();
jest.mock("../../../../../hooks/useDemoCatalogueAvailable", () => ({
  useDemoCatalogueAvailable: () => useDemoCatalogueAvailableMock(),
}));

jest.mock("../../../../../components/storefront/StorefrontProductCard", () => ({
  StorefrontProductCard: ({ product }: { product: { id: string } }) => (
    <div data-testid="product-card">{product.id}</div>
  ),
}));

import { render, screen } from "@testing-library/react";

import { ShopBrandingProvider, useShopBranding } from "@/components/providers/ShopBrandingProvider";
import { getArticlesByShop, mockShops } from "@/data/mockData";

import DemoShopStorefrontPage from "./page";

function BrandingProbe() {
  const { branding } = useShopBranding();
  return <div data-testid="branding">{branding ? `${branding.shopId}:${branding.name}` : "none"}</div>;
}

function renderPage() {
  return render(
    <ShopBrandingProvider>
      <BrandingProbe />
      <DemoShopStorefrontPage />
    </ShopBrandingProvider>
  );
}

describe("DemoShopStorefrontPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useDemoCatalogueAvailableMock.mockReturnValue(true);
    paramsShopId = "shop-techpoint";
  });

  it("shows a loading state while availability is still resolving", () => {
    useDemoCatalogueAvailableMock.mockReturnValue(undefined);
    renderPage();

    expect(screen.getByText("Chargement...")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("redirects to /catalogue once the demo is no longer available, even on direct URL access", () => {
    useDemoCatalogueAvailableMock.mockReturnValue(false);
    renderPage();

    expect(replaceMock).toHaveBeenCalledWith("/catalogue");
  });

  it("renders the demo shop's own products and pushes its branding up (BF-124-style)", () => {
    const shop = mockShops.find((candidate) => candidate.id === "shop-techpoint")!;
    renderPage();

    expect(screen.getByRole("heading", { name: shop.name })).toBeInTheDocument();
    const articles = getArticlesByShop(shop.id);
    for (const article of articles) {
      expect(screen.getByText(article.id)).toBeInTheDocument();
    }
    expect(screen.getByTestId("branding")).toHaveTextContent(`${shop.id}:${shop.name}`);
  });

  it("shows an honest not-found message for an unknown demo shop id", () => {
    paramsShopId = "does-not-exist";
    renderPage();

    expect(screen.getByText("Boutique de démo introuvable.")).toBeInTheDocument();
    expect(screen.getByTestId("branding")).toHaveTextContent("none");
  });
});

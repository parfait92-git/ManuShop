// La visite guidée (BF-134) charge le SDK Firebase via useAuth — hors sujet ici.
jest.mock("../../../../components/onboarding/PageTour", () => ({ PageTour: () => null }));

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

import { render, screen, waitFor } from "@testing-library/react";

import {
  ShopBrandingProvider,
  useShopBranding,
} from "../../../../components/providers/ShopBrandingProvider";
import ShopStorefrontPage from "./page";

function BrandingSpy({ onBranding }: { onBranding: (b: unknown) => void }) {
  const { branding } = useShopBranding();
  onBranding(branding);
  return null;
}

function renderPage() {
  return render(
    <ShopBrandingProvider>
      <ShopStorefrontPage />
    </ShopBrandingProvider>
  );
}

describe("ShopStorefrontPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows a loading state while the shop resolves", () => {
    getShopMock.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText("Chargement...")).toBeInTheDocument();
  });

  it("shows a not-found message when the shop doesn't exist", async () => {
    getShopMock.mockResolvedValue(null);
    renderPage();

    expect(
      await screen.findByText("Boutique introuvable ou non publiée.")
    ).toBeInTheDocument();
    expect(getShopMock).toHaveBeenCalledWith("shop-1");
  });

  it("shows a not-found message when the shop exists but isn't published", async () => {
    getShopMock.mockResolvedValue({ id: "shop-1", isPublished: false });
    renderPage();

    expect(
      await screen.findByText("Boutique introuvable ou non publiée.")
    ).toBeInTheDocument();
  });

  it("renders the shop's catalogue when published", async () => {
    getShopMock.mockResolvedValue({
      id: "shop-1",
      isPublished: true,
      name: "Ma Boutique",
    });
    renderPage();

    expect(await screen.findByTestId("catalogue-content")).toHaveTextContent(
      "shop-1"
    );
  });

  // BF-106 : le lien seul suffit à activer une icône du pied de page, mais
  // uniquement pour une boutique ayant le privilège premium
  // `socialFooterLinks` (demande explicite de l'utilisateur, 2026-09-28).
  describe("socialLinks (BF-106)", () => {
    it("leaves socialLinks unset without the socialFooterLinks privilege, even with links filled in", async () => {
      getShopMock.mockResolvedValue({
        id: "shop-1",
        isPublished: true,
        name: "Ma Boutique",
        whatsappBusinessUrl: "https://wa.me/221700000000",
        facebookUrl: "https://facebook.com/maboutique",
      });
      let captured: unknown;
      render(
        <ShopBrandingProvider>
          <ShopStorefrontPage />
          <BrandingSpy onBranding={(b) => (captured = b)} />
        </ShopBrandingProvider>
      );

      await screen.findByTestId("catalogue-content");
      await waitFor(() =>
        expect(
          (captured as { socialLinks?: unknown } | null)?.socialLinks
        ).toBeUndefined()
      );
    });

    it("only includes networks with a non-empty link, with the privilege active", async () => {
      getShopMock.mockResolvedValue({
        id: "shop-1",
        isPublished: true,
        name: "Ma Boutique",
        premiumFeatures: ["socialFooterLinks"],
        whatsappBusinessUrl: "https://wa.me/221700000000",
        facebookUrl: "",
        instagramUrl: "https://instagram.com/maboutique",
      });
      let captured: unknown;
      render(
        <ShopBrandingProvider>
          <ShopStorefrontPage />
          <BrandingSpy onBranding={(b) => (captured = b)} />
        </ShopBrandingProvider>
      );

      await screen.findByTestId("catalogue-content");
      await waitFor(() =>
        expect(
          (captured as { socialLinks?: Record<string, string> } | null)
            ?.socialLinks
        ).toEqual({
          whatsapp: "https://wa.me/221700000000",
          instagram: "https://instagram.com/maboutique",
        })
      );
    });

    it("leaves socialLinks unset when the privilege is active but no link is filled", async () => {
      getShopMock.mockResolvedValue({
        id: "shop-1",
        isPublished: true,
        name: "Ma Boutique",
        premiumFeatures: ["socialFooterLinks"],
      });
      let captured: unknown;
      render(
        <ShopBrandingProvider>
          <ShopStorefrontPage />
          <BrandingSpy onBranding={(b) => (captured = b)} />
        </ShopBrandingProvider>
      );

      await screen.findByTestId("catalogue-content");
      await waitFor(() =>
        expect(
          (captured as { socialLinks?: unknown } | null)?.socialLinks
        ).toBeUndefined()
      );
    });
  });
});

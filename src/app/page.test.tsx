import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { LucideIcon } from "lucide-react";

jest.mock("../lib/firebase", () => ({ db: {}, auth: {} }));

const pushMock = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

jest.mock("../components/providers/AuthProvider", () => ({
  useAuth: () => ({ firebaseUser: null }),
}));

jest.mock("../services/AuthService", () => ({
  authService: { logout: jest.fn() },
}));

const useDemoCatalogueAvailableMock = jest.fn();
jest.mock("../hooks/useDemoCatalogueAvailable", () => ({
  useDemoCatalogueAvailable: () => useDemoCatalogueAvailableMock(),
}));

const useMarketCatalogueMock = jest.fn();
jest.mock("../hooks/useMarketCatalogue", () => ({
  useMarketCatalogue: () => useMarketCatalogueMock(),
}));

// ContactSuperAdminCta (bouton "Nous contacter") importe SupportMessageService,
// qui importe à son tour les Server Actions de supportMessageActions.ts — ces
// dernières chargent `jose` (ESM pur), qui plante sous la transformation CJS
// de Jest si le module réel est chargé. Voir ProductDetailPageContent.test.tsx
// pour le même piège avec AuthProvider.
jest.mock("../services/SupportMessageService", () => ({
  supportMessageService: { sendContactMessage: jest.fn() },
}));

// Promotion de l'accueil, lue côté serveur dans les réglages (Super Admin).
const getLaunchPromoMock = jest.fn();
jest.mock("../server/seo/publicData", () => ({
  getLaunchPromo: () => getLaunchPromoMock(),
  getPublicSiteUrl: () => Promise.resolve("https://manu-shop.vercel.app"),
}));

import Home from "./page";

/** La page d'accueil est asynchrone (elle lit la promotion) : on attend son
 * rendu avant de le monter. */
async function renderHome() {
  return render(await Home());
}
import { HeroSection } from "@/components/sections/HeroSection";
import { Badge } from "@/components/ui/Badge";
import { FeatureCard } from "@/components/ui/FeatureCard";
import { GlassButton } from "@/components/ui/GlassButton";

const TestIcon = React.forwardRef(function TestIconComponent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ref: any
) {
  return <svg data-testid="test-icon" {...props} ref={ref} />;
}) as unknown as LucideIcon;

TestIcon.displayName = "TestIcon";

describe("Home page", () => {
  beforeEach(() => {
    getLaunchPromoMock.mockResolvedValue({
      enabled: true,
      eyebrow: "Promotion de lancement",
      title: "Votre première vitrine digitale commence ici.",
      description: "Profitez de l'offre spéciale réservée aux commerçants.",
      endsAt: "2099-10-30T23:59:59+01:00",
    });
    useDemoCatalogueAvailableMock.mockReturnValue(true);
    useMarketCatalogueMock.mockReturnValue(undefined);
  });

  it("renders the landing layout from the mockup", async () => {
    await renderHome();

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Votre boutique, sans limites/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Découvrir la boutique" })).toHaveAttribute(
      "href",
      "/catalogue"
    );
    // "Nous contacter" ouvre un dialogue (ContactSuperAdminCta), pas un lien
    // mailto: — voir ContactSuperAdminCta.test.tsx pour le comportement.
    expect(
      screen.getByRole("button", { name: /Nous contacter/ })
    ).toBeInTheDocument();
    // Les 3 cartes viennent désormais de getFeaturedArticles() (données de
    // démo, voir src/data/mockData.ts) plutôt que d'un tableau figé —
    // "Powerbank 10000mAh" (TechPoint, en promo) est en tête du classement.
    expect(screen.getByText("Powerbank 10000mAh")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Votre première vitrine digitale commence ici.",
      })
    ).toBeInTheDocument();
  });

  it("shows the promotion set by the Super Admin, and hides it when disabled or unreadable", async () => {
    const { unmount } = await renderHome();
    expect(screen.getByText("Votre première vitrine digitale commence ici.")).toBeInTheDocument();
    unmount();

    getLaunchPromoMock.mockResolvedValue({
      enabled: false,
      eyebrow: "",
      title: "Offre désactivée",
      description: "Cette offre ne doit pas apparaître.",
      endsAt: "2099-10-30T23:59:59+01:00",
    });
    const second = await renderHome();
    expect(screen.queryByText("Offre désactivée")).not.toBeInTheDocument();
    second.unmount();

    getLaunchPromoMock.mockResolvedValue(null);
    await renderHome();
    expect(screen.queryByText(/L.offre expire dans/)).not.toBeInTheDocument();
  });

  it("opens and closes the mobile navigation", async () => {
    const user = userEvent.setup();
    await renderHome();

    await user.click(screen.getByRole("button", { name: "Ouvrir le menu" }));

    expect(screen.getByLabelText("Navigation mobile")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fermer le menu" })).toBeInTheDocument();

    await user.click(
      screen.getByRole("navigation", { name: "Navigation mobile" }).querySelector(
        'a[href="/catalogue"]'
      ) as HTMLAnchorElement
    );

    expect(screen.queryByLabelText("Navigation mobile")).not.toBeInTheDocument();
  });

  it("navigates to the catalogue with the search term from the header search", async () => {
    const user = userEvent.setup();
    await renderHome();

    await user.type(screen.getByLabelText("Rechercher un produit"), "wax");
    await user.keyboard("{Enter}");

    expect(pushMock).toHaveBeenCalledWith("/catalogue?q=wax");
  });

  it("renders hero section without optional eyebrow, watermark and ctas", () => {
    render(
      <HeroSection
        heading="ManuShop"
        description="Digitalisez votre boutique."
      />
    );

    const heading = screen.getByRole("heading", { name: "ManuShop" });
    const section = heading.closest("section");

    expect(heading).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(section?.querySelector('[class*="hero__actions"]')).toBeNull();
    expect(section?.querySelector('[class*="hero__watermark"]')).toBeNull();
  });

  it("renders optional component branches", () => {
    render(
      <>
        <Badge icon={<span data-testid="badge-icon" />}>Nouveau</Badge>
        <FeatureCard
          icon={TestIcon}
          title="Catalogue"
          description="Description"
        />
        <GlassButton>Découvrir</GlassButton>
      </>
    );

    expect(screen.getByTestId("badge-icon")).toBeInTheDocument();
    expect(screen.getByTestId("test-icon")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Découvrir" })).toHaveAttribute(
      "href",
      "#"
    );
  });
});

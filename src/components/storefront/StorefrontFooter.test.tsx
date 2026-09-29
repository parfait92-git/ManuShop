import { render, screen } from "@testing-library/react";
import { useEffect } from "react";

import {
  ShopBrandingProvider,
  useShopBranding,
  type ShopBranding,
} from "@/components/providers/ShopBrandingProvider";
import { StorefrontFooter } from "./StorefrontFooter";

function SetBranding({ branding }: { branding: ShopBranding | null }) {
  const { setBranding } = useShopBranding();
  useEffect(() => setBranding(branding), [branding, setBranding]);
  return null;
}

function renderWithBranding(branding: ShopBranding | null) {
  return render(
    <ShopBrandingProvider>
      <SetBranding branding={branding} />
      <StorefrontFooter />
    </ShopBrandingProvider>
  );
}

// BF-106 : un réseau s'affiche dès que son lien est renseigné — pas de case
// à cocher séparée (demande explicite de l'utilisateur, 2026-09-28). Le
// filtrage par lien renseigné + privilège premium est fait en amont
// (`ShopStorefrontPage`) ; ce composant affiche fidèlement ce qu'on lui
// donne dans `branding.socialLinks`.
describe("StorefrontFooter", () => {
  it("shows only the copyright line when there is no shop context (e.g. /catalogue)", () => {
    render(
      <ShopBrandingProvider>
        <StorefrontFooter />
      </ShopBrandingProvider>
    );

    expect(screen.getByText(/ManuShop/)).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("shows only the copyright line when the shop has no social links", () => {
    renderWithBranding({ shopId: "shop-1", name: "Ma Boutique" });

    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("renders a link for each network that has a URL, in a fixed order", () => {
    renderWithBranding({
      shopId: "shop-1",
      name: "Ma Boutique",
      socialLinks: {
        instagram: "https://instagram.com/maboutique",
        whatsapp: "https://wa.me/221700000000",
      },
    });

    const nav = screen.getByRole("navigation", {
      name: "Réseaux sociaux de Ma Boutique",
    });
    const links = nav.querySelectorAll("a");
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveTextContent("WhatsApp");
    expect(links[0]).toHaveAttribute("href", "https://wa.me/221700000000");
    expect(links[1]).toHaveTextContent("Instagram");

    expect(screen.queryByText("Facebook")).not.toBeInTheDocument();
    expect(screen.queryByText("TikTok")).not.toBeInTheDocument();
  });
});

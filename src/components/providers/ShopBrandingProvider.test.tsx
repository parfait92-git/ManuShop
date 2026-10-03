import { act, render, screen } from "@testing-library/react";

import { ShopBrandingProvider, useClearShopBranding, useShopBranding } from "./ShopBrandingProvider";

function Show() {
  const { branding, setBranding } = useShopBranding();
  return (
    <>
      <p>{branding?.name ?? "ManuShop"}</p>
      <button type="button" onClick={() => setBranding({ shopId: "shop-1", name: "Chez Awa" })}>
        visiter
      </button>
    </>
  );
}

function Market() {
  useClearShopBranding();
  return null;
}

describe("ShopBrandingProvider", () => {
  beforeEach(() => sessionStorage.clear());

  it("keeps the visited shop across pages and reloads, for the session", async () => {
    const first = render(
      <ShopBrandingProvider>
        <Show />
      </ShopBrandingProvider>
    );
    act(() => screen.getByRole("button", { name: "visiter" }).click());
    expect(screen.getByText("Chez Awa")).toBeInTheDocument();
    first.unmount();

    // Nouvelle page (ou rechargement) : la boutique est toujours connue.
    render(
      <ShopBrandingProvider>
        <Show />
      </ShopBrandingProvider>
    );
    expect(await screen.findByText("Chez Awa")).toBeInTheDocument();
  });

  it("goes back to ManuShop on the platform's pages", async () => {
    sessionStorage.setItem("manushop:current-shop", JSON.stringify({ shopId: "shop-1", name: "Chez Awa" }));
    render(
      <ShopBrandingProvider>
        <Show />
        <Market />
      </ShopBrandingProvider>
    );
    expect(await screen.findByText("ManuShop")).toBeInTheDocument();
    expect(sessionStorage.getItem("manushop:current-shop")).toBeNull();
  });
});

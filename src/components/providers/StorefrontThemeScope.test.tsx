const useShopBrandingMock = jest.fn();
jest.mock("./ShopBrandingProvider", () => ({ useShopBranding: () => useShopBrandingMock() }));
const useShopThemeMock = jest.fn();
jest.mock("../../hooks/useShopTheme", () => ({
  useShopTheme: (...args: unknown[]) => useShopThemeMock(...args),
}));

import { render, screen } from "@testing-library/react";

import { StorefrontThemeScope } from "./StorefrontThemeScope";

describe("StorefrontThemeScope", () => {
  it("dresses a shop's storefront with that shop's theme", () => {
    useShopBrandingMock.mockReturnValue({ branding: { shopId: "shop-1", name: "Chez Awa" } });
    useShopThemeMock.mockReturnValue({ theme: { siteTheme: "default" } });
    render(
      <StorefrontThemeScope>
        <p>vitrine</p>
      </StorefrontThemeScope>
    );
    expect(useShopThemeMock).toHaveBeenCalledWith("shop-1");
    expect(screen.getByText("vitrine").parentElement).toHaveAttribute("data-shop-theme", "default");
  });

  it("uses the default theme on platform pages", () => {
    useShopBrandingMock.mockReturnValue({ branding: null });
    useShopThemeMock.mockReturnValue({ theme: { siteTheme: "default" } });
    render(<StorefrontThemeScope>x</StorefrontThemeScope>);
    expect(useShopThemeMock).toHaveBeenCalledWith(undefined);
  });
});

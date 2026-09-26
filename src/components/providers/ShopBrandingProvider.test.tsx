import { renderHook } from "@testing-library/react";
import { act } from "react";

import {
  ShopBrandingProvider,
  useShopBranding,
} from "./ShopBrandingProvider";

describe("useShopBranding", () => {
  it("throws when used outside of a ShopBrandingProvider", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useShopBranding())).toThrow(
      "useShopBranding doit être utilisé à l'intérieur d'un ShopBrandingProvider."
    );
    spy.mockRestore();
  });

  it("starts with no branding and lets a descendant set/clear it", () => {
    const { result } = renderHook(() => useShopBranding(), {
      wrapper: ShopBrandingProvider,
    });

    expect(result.current.branding).toBeNull();

    act(() => {
      result.current.setBranding({ shopId: "shop-1", name: "Ma Boutique" });
    });
    expect(result.current.branding).toEqual({
      shopId: "shop-1",
      name: "Ma Boutique",
    });

    act(() => {
      result.current.setBranding(null);
    });
    expect(result.current.branding).toBeNull();
  });
});

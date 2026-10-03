jest.mock("./usePremiumCatalog");
const watchMock = jest.fn();
const watchPremiumMock = jest.fn();
jest.mock("../services/ThemeService", () => ({
  themeService: {
    watchActiveTheme: (...args: unknown[]) => watchMock(...args),
    watchShopPremium: (...args: unknown[]) => watchPremiumMock(...args),
  },
}));

import { act, renderHook } from "@testing-library/react";

import { useShopTheme } from "./useShopTheme";

describe("useShopTheme", () => {
  beforeEach(() => jest.clearAllMocks());

  it("uses the default theme without a shop, and watches nothing", () => {
    const { result } = renderHook(() => useShopTheme(undefined));
    expect(result.current).toEqual(expect.objectContaining({ loading: false }));
    expect(result.current.theme.id).toBe("default");
    expect(watchMock).not.toHaveBeenCalled();
  });

  it("follows the shop's applied theme live, and stops watching on unmount", () => {
    const unsubscribe = jest.fn();
    let push: (id: string) => void = () => {};
    watchMock.mockImplementation((_shopId: string, onChange: (id: string) => void) => {
      push = onChange;
      return unsubscribe;
    });
    let pushPremium: (state: object) => void = () => {};
    watchPremiumMock.mockImplementation((_id: string, cb: (state: object) => void) => {
      pushPremium = cb;
      return unsubscribe;
    });
    const { result, unmount } = renderHook(() => useShopTheme("shop-1"));

    expect(watchMock).toHaveBeenCalledWith("shop-1", expect.any(Function));
    expect(result.current.loading).toBe(true);
    act(() => push("default"));
    act(() => pushPremium({ premiumFeatures: [] }));
    expect(result.current).toEqual(expect.objectContaining({ loading: false }));
    // Un thème retiré du catalogue retombe sur celui par défaut.
    act(() => push("retire"));
    expect(result.current.theme.id).toBe("default");

    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it("falls back to the free theme when the shop lost access to its premium theme", () => {
    watchMock.mockImplementation((_id: string, cb: (id: string) => void) => {
      cb("ocean-neon");
      return () => {};
    });
    watchPremiumMock.mockImplementation((_id: string, cb: (state: object) => void) => {
      cb({ premiumFeatures: [] });
      return () => {};
    });
    const { result } = renderHook(() => useShopTheme("shop-1"));
    expect(result.current.theme.id).toBe("default");
    expect(result.current.revokedTheme?.id).toBe("ocean-neon");
  });

  it("keeps a premium theme the shop owns", () => {
    watchMock.mockImplementation((_id: string, cb: (id: string) => void) => {
      cb("ocean-neon");
      return () => {};
    });
    watchPremiumMock.mockImplementation((_id: string, cb: (state: object) => void) => {
      cb({ premiumFeatures: ["theme:ocean-neon"] });
      return () => {};
    });
    const { result } = renderHook(() => useShopTheme("shop-1"));
    expect(result.current.theme.id).toBe("ocean-neon");
    expect(result.current.revokedTheme).toBeNull();
  });
});

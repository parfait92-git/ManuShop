const watchMock = jest.fn();
jest.mock("../services/ThemeService", () => ({
  themeService: { watchActiveTheme: (...args: unknown[]) => watchMock(...args) },
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
    const { result, unmount } = renderHook(() => useShopTheme("shop-1"));

    expect(watchMock).toHaveBeenCalledWith("shop-1", expect.any(Function));
    expect(result.current.loading).toBe(true);
    act(() => push("default"));
    expect(result.current).toEqual(expect.objectContaining({ loading: false }));
    // Un thème retiré du catalogue retombe sur celui par défaut.
    act(() => push("retire"));
    expect(result.current.theme.id).toBe("default");

    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });
});

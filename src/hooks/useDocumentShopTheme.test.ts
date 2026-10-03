import { renderHook } from "@testing-library/react";

import { useDocumentShopTheme } from "./useDocumentShopTheme";

describe("useDocumentShopTheme", () => {
  it("puts the shop's theme on <html> while mounted, for dialogs and tour bubbles", () => {
    const { rerender, unmount } = renderHook(({ theme }) => useDocumentShopTheme(theme), {
      initialProps: { theme: "wax-soleil" },
    });
    expect(document.documentElement.dataset.shopTheme).toBe("wax-soleil");

    rerender({ theme: "default" });
    expect(document.documentElement.dataset.shopTheme).toBe("default");

    unmount();
    expect(document.documentElement.dataset.shopTheme).toBeUndefined();
  });
});

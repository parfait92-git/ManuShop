import { readFileSync } from "fs";
import { join } from "path";

import { DEFAULT_THEME_ID, isKnownTheme, resolveTheme, THEMES } from "./registry";

const css = readFileSync(join(process.cwd(), "src/styles/dashboard-theme.css"), "utf8");

describe("theme registry", () => {
  it("puts the default theme first, and gives each theme a unique id", () => {
    expect(THEMES[0].id).toBe(DEFAULT_THEME_ID);
    expect(new Set(THEMES.map((t) => t.id)).size).toBe(THEMES.length);
  });

  it("falls back to the default theme for an unknown or missing id", () => {
    expect(resolveTheme("inconnu").id).toBe(DEFAULT_THEME_ID);
    expect(resolveTheme(undefined).id).toBe(DEFAULT_THEME_ID);
    expect(isKnownTheme("default")).toBe(true);
    expect(isKnownTheme("inconnu")).toBe(false);
  });

  it.each(THEMES)("$id has an invoice colour readable under white text", (theme) => {
    const lum = (hex: string) => {
      const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
      const [r, g, b] = c.map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    expect(theme.invoiceColor).toMatch(/^#[0-9A-F]{6}$/);
    expect(1.05 / (lum(theme.invoiceColor) + 0.05)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(THEMES)("$id has its CSS blocks", (theme) => {
    expect(css).toContain(`[data-dashboard-theme="${theme.dashboardTheme}"]`);
    expect(css).toContain(`[data-shop-theme="${theme.siteTheme}"]`);
  });
});

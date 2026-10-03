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

  it.each(THEMES)("$id has its CSS blocks", (theme) => {
    expect(css).toContain(`[data-dashboard-theme="${theme.dashboardTheme}"]`);
    expect(css).toContain(`[data-shop-theme="${theme.siteTheme}"]`);
  });
});

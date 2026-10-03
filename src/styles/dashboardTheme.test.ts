import { readFileSync } from "fs";
import { join } from "path";

import { THEMES } from "@/themes/registry";

/** Variables d'un bloc `[<attribut>="<id>"]` du fichier de thème. */
function themeVariables(themeId: string, attribute = "data-dashboard-theme"): Record<string, string> {
  const css = readFileSync(join(__dirname, "dashboard-theme.css"), "utf8");
  const start = css.indexOf(`[${attribute}="${themeId}"] {`);
  if (start === -1) throw new Error(`Thème ${themeId} introuvable`);
  const block = css.slice(start, css.indexOf("\n}", start));
  return Object.fromEntries(
    [...block.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()])
  );
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** [premier plan, fond, ratio minimal] — texte 4,5:1, éléments
 * graphiques (axes, icônes, courbes) 3:1 (WCAG 2.1, 1.4.3 et 1.4.11). */
const PAIRS: [string, string, number][] = [];
const CARD_BACKGROUNDS = ["--dashboard-card-bg", "--dashboard-card-gradient-start", "--dashboard-card-gradient-end"];
for (const bg of [...CARD_BACKGROUNDS, "--dashboard-bg"]) {
  for (const fg of ["--dashboard-text", "--dashboard-text-muted", "--dashboard-text-subtle"]) {
    PAIRS.push([fg, bg, 4.5]);
  }
}
for (const bg of CARD_BACKGROUNDS) {
  PAIRS.push(
    ["--kpi-positive", bg, 4.5],
    ["--kpi-negative", bg, 4.5],
    ["--kpi-neutral", bg, 4.5],
    ["--dashboard-accent", bg, 4.5],
    ["--dashboard-table-header", bg, 4.5],
    ["--chart-axis", bg, 4.5],
    ["--chart-1", bg, 3],
    ["--chart-2", bg, 3],
    ["--chart-bar", bg, 3],
    ["--gauge-fill", bg, 3],
    ["--gauge-fill-end", bg, 3],
    ["--status-pending", bg, 4.5],
    ["--status-progress", bg, 4.5],
    ["--status-success", bg, 4.5],
    ["--status-warning", bg, 4.5],
    ["--status-danger", bg, 4.5],
    ["--status-muted", bg, 4.5]
  );
}
PAIRS.push(
  ["--dashboard-icon-fg", "--dashboard-icon-bg", 3],
  ["--chart-tooltip-text", "--chart-tooltip-bg", 4.5],
  ["--dashboard-welcome-text", "--dashboard-welcome-gradient-start", 4.5],
  ["--dashboard-welcome-text", "--dashboard-welcome-gradient-end", 4.5],
  ["--dashboard-welcome-muted", "--dashboard-welcome-gradient-start", 4.5],
  ["--dashboard-welcome-muted", "--dashboard-welcome-gradient-end", 4.5]
);

// Tous les thèmes du catalogue, plus le thème clair de contrôle.
const DASHBOARD_THEMES = [...new Set([...THEMES.map((t) => t.dashboardTheme), "light"])];

describe.each(DASHBOARD_THEMES)("thème de tableau de bord « %s »", (themeId) => {
  const vars = themeVariables(themeId);

  it("defines every variable of the default theme", () => {
    expect(Object.keys(vars).sort()).toEqual(Object.keys(themeVariables("default")).sort());
  });

  it.each(PAIRS)("%s on %s reaches %s:1", (fg, bg, min) => {
    expect(vars[fg]).toMatch(/^#[0-9a-f]{6}$/i);
    expect(vars[bg]).toMatch(/^#[0-9a-f]{6}$/i);
    expect(contrast(vars[fg], vars[bg])).toBeGreaterThanOrEqual(min);
  });
});

/** Habillage du site (vitrine, espace de gestion) : couleurs du système
 * de style redéfinies par un thème. Le thème par défaut n'en redéfinit
 * aucune (apparence d'origine) ; les autres doivent rester lisibles. */
const SITE_PAIRS: [string, string, number][] = [
  ["--foreground", "--background", 4.5],
  ["--card-foreground", "--card", 4.5],
  ["--popover-foreground", "--popover", 4.5],
  ["--primary-foreground", "--primary", 4.5],
  ["--primary", "--background", 4.5],
  ["--primary", "--card", 4.5],
  ["--secondary-foreground", "--secondary", 4.5],
  ["--muted-foreground", "--background", 4.5],
  ["--muted-foreground", "--muted", 4.5],
  ["--accent-foreground", "--accent", 4.5],
  ["--destructive", "--background", 4.5],
  ["--ring", "--background", 3],
];

/** Cadre de l'espace de gestion et visites guidées : défini par chaque
 * thème, y compris celui par défaut. */
const SHELL_PAIRS: [string, string, number][] = [];
for (const bg of ["--shell-surface", "--shell-bg", "--shell-hover"]) {
  for (const fg of ["--shell-text", "--shell-text-muted", "--shell-text-subtle"]) {
    SHELL_PAIRS.push([fg, bg, 4.5]);
  }
}
SHELL_PAIRS.push(
  ["--shell-nav-active-text", "--shell-nav-active-bg", 4.5],
  ["--shell-badge-text", "--shell-badge-bg", 4.5],
  ["--shell-alert-text", "--shell-alert-bg", 4.5],
  ["--shell-avatar-text", "--shell-avatar-bg", 4.5],
  ["--shell-promo-title", "--shell-promo-bg", 4.5],
  ["--shell-promo-text", "--shell-promo-bg", 4.5],
  ["--shell-brand-icon", "--shell-brand-bg", 3],
  ["--tour-primary-text", "--tour-primary", 4.5]
);

const SITE_THEMES = [...new Set(THEMES.map((t) => t.siteTheme))];

describe.each(SITE_THEMES)("habillage du site « %s »", (themeId) => {
  const vars = themeVariables(themeId, "data-shop-theme");
  const shellKeys = Object.keys(themeVariables("default", "data-shop-theme")).sort();

  it("defines the whole management frame", () => {
    expect(Object.keys(vars).filter((k) => /^--(shell|tour)-/.test(k)).sort()).toEqual(shellKeys);
  });

  it.each(SHELL_PAIRS)("%s on %s reaches %s:1", (fg, bg, min) => {
    expect(vars[fg]).toMatch(/^#[0-9a-f]{6}$/i);
    expect(vars[bg]).toMatch(/^#[0-9a-f]{6}$/i);
    expect(contrast(vars[fg], vars[bg])).toBeGreaterThanOrEqual(min);
  });

  // Le thème par défaut garde les couleurs d'origine du système de style
  // (globals.css) ; les autres les redéfinissent, et doivent rester lisibles.
  const redefinesSite = "--background" in vars;
  (redefinesSite ? it.each(SITE_PAIRS) : it.skip.each(SITE_PAIRS))(
    "%s on %s reaches %s:1",
    (fg, bg, min) => {
      expect(vars[fg]).toMatch(/^#[0-9a-f]{6}$/i);
      expect(vars[bg]).toMatch(/^#[0-9a-f]{6}$/i);
      expect(contrast(vars[fg], vars[bg])).toBeGreaterThanOrEqual(min);
    }
  );
});

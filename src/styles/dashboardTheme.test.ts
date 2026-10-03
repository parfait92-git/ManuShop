import { readFileSync } from "fs";
import { join } from "path";

/** Variables d'un bloc `[data-dashboard-theme="<id>"]` du fichier de thème. */
function themeVariables(themeId: string): Record<string, string> {
  const css = readFileSync(join(__dirname, "dashboard-theme.css"), "utf8");
  const start = css.indexOf(`[data-dashboard-theme="${themeId}"] {`);
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

describe.each(["default", "light"])("thème de tableau de bord « %s »", (themeId) => {
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

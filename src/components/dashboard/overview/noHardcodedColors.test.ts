import { readdirSync, readFileSync } from "fs";
import { join } from "path";

/**
 * Thèmes (2026-10-03) : aucune couleur en dur dans les composants de
 * l'accueil — tout passe par les variables de
 * `src/styles/dashboard-theme.css`, sans quoi un thème vendu à un
 * commerçant ne pourrait pas les remplacer.
 */
const FORBIDDEN: [string, RegExp][] = [
  ["couleur hexadécimale", /#[0-9a-fA-F]{3,8}\b/],
  ["rgb()/hsl()/oklch()", /\b(rgba?|hsla?|oklch)\(/],
  [
    "classe de palette Tailwind",
    /\b(bg|text|border|from|to|via|fill|stroke|ring|shadow)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)\b/,
  ],
  ["couleur nommée dans un attribut", /(fill|stroke|stopColor|color)=["'](?!var\(|url\(|none)[a-z]+["']/],
];

// L'accueil du tableau de bord et les miniatures de la page Thèmes.
const DIRS = [__dirname, join(__dirname, "..", "themes")];
const files = DIRS.flatMap((dir) =>
  readdirSync(dir)
    .filter((f) => /\.tsx?$/.test(f) && !f.endsWith(".test.ts") && !f.endsWith(".test.tsx"))
    .map((f) => join(dir, f))
);
// Cadre de l'espace de gestion, habillé par le thème de la boutique.
files.push(
  join(__dirname, "..", "DashboardSidebar.tsx"),
  join(__dirname, "..", "DashboardTopbar.tsx"),
  join(__dirname, "..", "..", "..", "app", "dashboard", "layout.tsx")
);

describe("dashboard overview components", () => {
  it("exist", () => {
    expect(files.length).toBeGreaterThan(8);
  });

  it.each(files)("%s uses only theme variables for colours", (file) => {
    const source = readFileSync(file, "utf8")
      // Les commentaires peuvent parler de couleurs.
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    const found = FORBIDDEN.filter(([, pattern]) => pattern.test(source)).map(([label]) => label);
    expect(found).toEqual([]);
  });
});

/**
 * Pages de l'espace de gestion (2026-10-03) : neutres et couleur d'accent
 * passent par les variables du cadre (`text-shell-*`, `bg-shell-*`…) pour
 * suivre le thème de la boutique. Les couleurs d'état (vert « en stock »,
 * rouge « rupture », jaune « avertissement »…) restent permises : elles
 * portent un sens, identique dans tous les thèmes.
 */
const NEUTRAL_OR_BRAND =
  /\b(bg|text|border|ring|divide|from|to|via|placeholder|outline)-(slate|gray|zinc|neutral|stone|cyan|white|black)\b/;
/** Coche blanche posée sur une pastille de couleur au choix du commerçant. */
const ALLOWED: Record<string, RegExp> = { "ShopInvoiceSettings.tsx": /text-white/g };

const dashboardDir = join(__dirname, "..");
const pages = readdirSync(dashboardDir).filter((f) => f.endsWith(".tsx") && !f.endsWith(".test.tsx"));

describe("dashboard pages", () => {
  it.each(pages)("%s takes neutrals and accent from the theme", (file) => {
    let source = readFileSync(join(dashboardDir, file), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    if (ALLOWED[file]) source = source.replace(ALLOWED[file], "");
    expect(source.match(NEUTRAL_OR_BRAND)?.[0] ?? null).toBeNull();
  });
});

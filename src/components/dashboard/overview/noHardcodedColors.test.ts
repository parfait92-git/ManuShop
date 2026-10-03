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

describe("dashboard overview components", () => {
  it("exist", () => {
    expect(files.length).toBeGreaterThan(5);
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

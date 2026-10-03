/**
 * Catalogue des thèmes de boutique (2026-10-03). Un thème habille tout le
 * site d'une boutique : sa vitrine (côté clients) et son espace de gestion
 * (côté gérant). Ses couleurs vivent dans des blocs CSS
 * `[data-shop-theme="<id>"]` et `[data-dashboard-theme="<id>"]`
 * (`src/styles/dashboard-theme.css`) ; ce catalogue dit seulement lesquels
 * existent et comment les présenter.
 *
 * Pour ajouter un thème : une entrée ici, ses blocs CSS, et c'est tout —
 * la page Thèmes le liste et le gérant peut l'appliquer.
 */

export interface ThemeDefinition {
  id: string;
  name: string;
  description: string;
  /** Points forts affichés sur la carte du thème. */
  highlights: string[];
  /** Thème de l'accueil du tableau de bord (`data-dashboard-theme`). */
  dashboardTheme: string;
  /** Thème de la vitrine et de l'espace de gestion (`data-shop-theme`). */
  siteTheme: string;
}

export const DEFAULT_THEME_ID = "default";

export const THEMES: ThemeDefinition[] = [
  {
    id: DEFAULT_THEME_ID,
    name: "ManuShop Nuit",
    description:
      "Le thème d'origine : vitrine claire et sobre, tableau de bord bleu nuit aux cartes en dégradé et accents bleus.",
    highlights: ["Vitrine claire et lisible", "Tableau de bord sombre", "Graphiques en dégradé bleu"],
    dashboardTheme: "default",
    siteTheme: "default",
  },
];

/** Thème connu, ou celui par défaut (id absent, retiré du catalogue…). */
export function resolveTheme(themeId: unknown): ThemeDefinition {
  return THEMES.find((theme) => theme.id === themeId) ?? THEMES[0];
}

export function isKnownTheme(themeId: unknown): boolean {
  return THEMES.some((theme) => theme.id === themeId);
}

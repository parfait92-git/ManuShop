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
  /** Couleur des factures de la boutique (titre, en-tête du tableau,
   * total, bandeau), sauf couleur choisie par le commerçant dans
   * Paramètres → Facturation. Texte blanc dessus : contraste vérifié. */
  invoiceColor: string;
}

export const DEFAULT_THEME_ID = "default";

export const THEMES: ThemeDefinition[] = [
  {
    id: DEFAULT_THEME_ID,
    name: "ManuShop Nuit",
    description:
      "Le thème d'origine : vitrine claire et sobre, tableau de bord clair aux cartes blanches, gris ardoise et accents cyan.",
    highlights: ["Vitrine claire et lisible", "Tableau de bord clair", "Accents cyan"],
    dashboardTheme: "manushop",
    siteTheme: "default",
    invoiceColor: "#3B5BA5",
  },
  {
    id: "wax-soleil",
    name: "Wax Soleil",
    description:
      "Clair et chaleureux, inspiré du pagne wax et des marchés : crème, terracotta, ocre et émeraude, coins arrondis.",
    highlights: ["Vitrine crème et terracotta", "Tableau de bord clair", "Idéal mode, beauté, artisanat"],
    dashboardTheme: "wax-soleil",
    siteTheme: "wax-soleil",
    invoiceColor: "#B4451F",
  },
  {
    id: "ocean-neon",
    name: "Néon Océan",
    description:
      "Tout en bleu nuit, accents bleu électrique : menus, espace de gestion et vitrine dans la même ambiance sombre et moderne.",
    highlights: ["Site entièrement sombre", "Accents bleu électrique", "Idéal électronique, high-tech, mode urbaine"],
    dashboardTheme: "default",
    siteTheme: "ocean-neon",
    invoiceColor: "#0062D6",
  },
  // Thèmes métier (2026-10-03).
  {
    id: "laiterie",
    name: "Crème Laitière",
    description:
      "Pour les produits laitiers : blanc crème, bleu lait et jaune beurre, des formes douces et très arrondies qui évoquent la fraîcheur.",
    highlights: ["Frais et lumineux", "Bleu lait et jaune beurre", "Idéal laiterie, fromagerie, yaourts"],
    dashboardTheme: "laiterie",
    siteTheme: "laiterie",
    invoiceColor: "#1D6FB8",
  },
  {
    id: "herboristerie",
    name: "Herboristerie",
    description:
      "Pour la médecine naturelle : beige, vert feuille et touches de miel, une ambiance végétale, apaisante et digne de confiance.",
    highlights: ["Ambiance végétale", "Vert feuille et beige", "Idéal plantes, tisanes, produits bio"],
    dashboardTheme: "herboristerie",
    siteTheme: "herboristerie",
    invoiceColor: "#2F6B3A",
  },
  {
    id: "cosmetique",
    name: "Rose Éclat",
    description:
      "Pour la cosmétique : rose poudré, or rose et prune, des courbes généreuses pour une boutique élégante et soignée.",
    highlights: ["Élégant et doux", "Rose poudré et prune", "Idéal beauté, soins, maquillage"],
    dashboardTheme: "cosmetique",
    siteTheme: "cosmetique",
    invoiceColor: "#A82E64",
  },
  {
    id: "verre-alu",
    name: "Verre & Alu",
    description:
      "Pour la miroiterie, le vitrage du bâtiment et les cadres aluminium : gris acier, bleu verre et graphite, des angles nets et précis.",
    highlights: ["Net et technique", "Gris acier et bleu verre", "Idéal miroirs, vitrages, aluminium"],
    dashboardTheme: "verre-alu",
    siteTheme: "verre-alu",
    invoiceColor: "#0E6F8A",
  },
  // Thèmes dorés (2026-10-03).
  {
    id: "or-lumiere",
    name: "Or Lumière",
    description:
      "Doré et clair : fonds ivoire et crème, or antique et bronze, pour une boutique raffinée et lumineuse.",
    highlights: ["Lumineux et raffiné", "Ivoire et or antique", "Idéal bijoux, mode, décoration"],
    dashboardTheme: "or-lumiere",
    siteTheme: "or-lumiere",
    invoiceColor: "#7A5D0F",
  },
  {
    id: "or-noir",
    name: "Or Noir",
    description:
      "Doré et sombre : noir profond, or vif et champagne, pour une boutique de prestige au caractère affirmé.",
    highlights: ["Luxe et prestige", "Noir profond et or vif", "Idéal parfums, montres, haute couture"],
    dashboardTheme: "or-noir",
    siteTheme: "or-noir",
    invoiceColor: "#7A5D0F",
  },
];

/** Thème connu, ou celui par défaut (id absent, retiré du catalogue…). */
export function resolveTheme(themeId: unknown): ThemeDefinition {
  return THEMES.find((theme) => theme.id === themeId) ?? THEMES[0];
}

export function isKnownTheme(themeId: unknown): boolean {
  return THEMES.some((theme) => theme.id === themeId);
}

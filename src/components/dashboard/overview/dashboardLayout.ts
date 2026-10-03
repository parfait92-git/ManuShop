/**
 * Disposition de l'accueil du tableau de bord (refonte du 2026-10-03) :
 * l'ordre et la largeur des blocs viennent de cette configuration, pas du
 * code des composants. Une disposition propre à un thème ou à une boutique
 * (réordonner, masquer un bloc) se déclarera ici, comme une liste.
 */

export type DashboardWidgetId =
  | "kpis"
  | "welcome"
  | "stock"
  | "sales"
  | "orders-week"
  | "recent-orders";

/** Largeur sur la grille : 1 à 3 colonnes. La grille suit la place
 * réellement disponible (requêtes de conteneur), pas la largeur de
 * l'écran : menu latéral et police agrandie compris. Sur 2 colonnes, 3
 * devient 2 ; sur 1 colonne, tout prend la ligne. */
export type WidgetSpan = 1 | 2 | 3;

export interface DashboardWidgetPlacement {
  id: DashboardWidgetId;
  span: WidgetSpan;
}

export const DEFAULT_DASHBOARD_LAYOUT: DashboardWidgetPlacement[] = [
  { id: "kpis", span: 3 },
  { id: "welcome", span: 2 },
  { id: "stock", span: 1 },
  { id: "sales", span: 2 },
  { id: "orders-week", span: 1 },
  { id: "recent-orders", span: 3 },
];

/** Classes de grille, écrites en entier pour que Tailwind les détecte. */
export const GRID_CLASS = "grid grid-flow-row-dense grid-cols-1 gap-5 @xl:grid-cols-2 @5xl:grid-cols-3";

export const SPAN_CLASS: Record<WidgetSpan, string> = {
  1: "",
  2: "@xl:col-span-2",
  3: "@xl:col-span-2 @5xl:col-span-3",
};

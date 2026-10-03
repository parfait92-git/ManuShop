import { useId } from "react";

/** Réglages communs des graphiques Recharts : uniquement des variables du
 * thème (`src/styles/dashboard-theme.css`). */
export const AXIS_TICK = { fill: "var(--chart-axis)", fontSize: 12 } as const;

export const TOOLTIP_STYLE = {
  contentStyle: {
    background: "var(--chart-tooltip-bg)",
    border: "1px solid var(--chart-tooltip-border)",
    borderRadius: 12,
    color: "var(--chart-tooltip-text)",
    fontSize: 13,
  },
  labelStyle: { color: "var(--chart-tooltip-text)", fontWeight: 600, marginBottom: 4 },
  itemStyle: { color: "var(--chart-tooltip-text)" },
  cursor: { stroke: "var(--chart-grid)", fill: "var(--dashboard-table-row-hover)" },
} as const;

/** Identifiant de dégradé SVG unique et utilisable dans `url(#…)` (ceux
 * de React contiennent des caractères qu'une URL SVG refuse). */
export function useSvgId(prefix: string): string {
  return `${prefix}-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
}

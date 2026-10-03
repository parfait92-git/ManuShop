"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { DashboardCard, DashboardEmpty } from "@/components/dashboard/overview/DashboardCard";
import { AXIS_TICK, TOOLTIP_STYLE, useSvgId } from "@/components/dashboard/overview/chartTheme";
import type { MonthPoint } from "@/lib/dashboardMetrics";

const monthLabel = (ms: number) =>
  new Date(ms).toLocaleDateString("fr-FR", { month: "short", timeZone: "Africa/Douala" }).replace(".", "");

/** Ventes par mois sur 12 mois : encaissé (livré) et commandé. */
export function SalesAreaChart({
  monthly,
  money,
}: {
  monthly: MonthPoint[];
  money: { full: (amount: number) => string; compact: (amount: number) => string };
}) {
  const deliveredId = useSvgId("sales-delivered");
  const orderedId = useSvgId("sales-ordered");
  const hasData = monthly.some((m) => m.ordered > 0);
  const data = monthly.map((m) => ({ ...m, label: monthLabel(m.monthStart) }));

  return (
    <DashboardCard
      title="Ventes par mois"
      subtitle="12 derniers mois — encaissé (commandes livrées) et commandé"
      dataTour="dashboard-sales-chart"
    >
      {hasData ? (
        <>
          <div className="flex flex-wrap gap-4 text-xs text-dash-muted">
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="size-2.5 rounded-full bg-[var(--chart-1)]" />
              Encaissé
            </span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="size-2.5 rounded-full bg-[var(--chart-2)]" />
              Commandé
            </span>
          </div>
          <div className="h-72" role="img" aria-label="Graphique des ventes par mois">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={deliveredId} x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="var(--chart-gradient-start)"
                      style={{ stopOpacity: "var(--chart-gradient-start-opacity)" }}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--chart-gradient-end)"
                      style={{ stopOpacity: "var(--chart-gradient-end-opacity)" }}
                    />
                  </linearGradient>
                  <linearGradient id={orderedId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="4 4" />
                <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis
                  tick={AXIS_TICK}
                  axisLine={false}
                  tickLine={false}
                  width={56}
                  tickFormatter={money.compact}
                />
                <Tooltip
                  {...TOOLTIP_STYLE}
                  formatter={(value, name) => [
                    money.full(Number(value)),
                    name === "delivered" ? "Encaissé" : "Commandé",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="ordered"
                  stroke="var(--chart-2)"
                  strokeWidth={2}
                  fill={`url(#${orderedId})`}
                />
                <Area
                  type="monotone"
                  dataKey="delivered"
                  stroke="var(--chart-1)"
                  strokeWidth={3}
                  fill={`url(#${deliveredId})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <DashboardEmpty>Aucune vente sur les 12 derniers mois pour l&apos;instant.</DashboardEmpty>
      )}
    </DashboardCard>
  );
}

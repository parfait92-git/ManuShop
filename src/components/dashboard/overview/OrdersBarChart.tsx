"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { DashboardCard, DashboardEmpty } from "@/components/dashboard/overview/DashboardCard";
import { AXIS_TICK, TOOLTIP_STYLE } from "@/components/dashboard/overview/chartTheme";
import type { DayPoint } from "@/lib/dashboardMetrics";

const dayLabel = (ms: number) =>
  new Date(ms).toLocaleDateString("fr-FR", { weekday: "short", timeZone: "Africa/Douala" }).replace(".", "");

/** Commandes reçues chaque jour, sur les 7 derniers jours. */
export function OrdersBarChart({ daily }: { daily: DayPoint[] }) {
  const total = daily.reduce((sum, d) => sum + d.orders, 0);
  const data = daily.map((d) => ({ ...d, label: dayLabel(d.dayStart) }));

  return (
    <DashboardCard
      title="Commandes de la semaine"
      subtitle={`${total} commande${total > 1 ? "s" : ""} sur 7 jours`}
      dataTour="dashboard-orders-chart"
    >
      {total > 0 ? (
        <div
          className="h-72 rounded-xl bg-dash-bg/60 p-3"
          role="img"
          aria-label="Graphique des commandes par jour"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="4 4" />
              <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} width={40} />
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(value) => [String(value), "Commandes"]}
              />
              <Bar dataKey="orders" fill="var(--chart-bar)" barSize={8} radius={[8, 8, 8, 8]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <DashboardEmpty>Aucune commande ces 7 derniers jours.</DashboardEmpty>
      )}
    </DashboardCard>
  );
}

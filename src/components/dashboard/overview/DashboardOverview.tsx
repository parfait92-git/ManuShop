"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { KpiRow } from "@/components/dashboard/overview/KpiRow";
import { OrdersBarChart } from "@/components/dashboard/overview/OrdersBarChart";
import { RecentOrdersTable } from "@/components/dashboard/overview/RecentOrdersTable";
import { SalesAreaChart } from "@/components/dashboard/overview/SalesAreaChart";
import { StockGauge } from "@/components/dashboard/overview/StockGauge";
import { WelcomeCard } from "@/components/dashboard/overview/WelcomeCard";
import {
  DEFAULT_DASHBOARD_LAYOUT,
  GRID_CLASS,
  SPAN_CLASS,
  type DashboardWidgetId,
  type DashboardWidgetPlacement,
} from "@/components/dashboard/overview/dashboardLayout";
import { useChartMoney } from "@/components/dashboard/overview/useChartMoney";
import { useCurrentShop } from "@/hooks/useCurrentShop";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useShopCurrency } from "@/hooks/useShopCurrency";
import { cn } from "cn";

/**
 * Accueil du tableau de bord sur tablette et ordinateur (refonte du
 * 2026-10-03), chargé seulement à partir de 768 px (`next/dynamic` dans
 * `app/dashboard/page.tsx`) : Recharts n'est jamais téléchargé sur mobile.
 *
 * - Couleurs : thème `theme` (`src/styles/dashboard-theme.css`), porté par
 *   l'attribut `data-dashboard-theme` de ce conteneur.
 * - Disposition : `layout` (`dashboardLayout.ts`), une liste de blocs.
 * - Données : réelles, celles de la boutique courante.
 */
export function DashboardOverview({
  shopId,
  theme = "default",
  layout = DEFAULT_DASHBOARD_LAYOUT,
}: {
  shopId: string;
  theme?: string;
  layout?: DashboardWidgetPlacement[];
}) {
  const { profile } = useAuth();
  const { shop } = useCurrentShop();
  const data = useDashboardData(shopId);
  const money = useChartMoney(useShopCurrency(shopId));

  let body: React.ReactNode;
  if (data.status === "loading") {
    body = <p className="text-sm text-dash-muted">Chargement du tableau de bord...</p>;
  } else if (data.status === "error") {
    body = (
      <p role="alert" className="text-sm text-dash-negative">
        Impossible de charger les chiffres de la boutique. Rechargez la page.
      </p>
    );
  } else {
    const { metrics } = data;
    const widgets: Record<DashboardWidgetId, React.ReactNode> = {
      kpis: <KpiRow metrics={metrics} money={money.full} />,
      welcome: (
        <WelcomeCard
          firstName={profile?.displayName.split(" ")[0] ?? ""}
          shopId={shopId}
          shopName={shop?.name ?? null}
          shopLogo={shop?.logo || undefined}
          toProcess={metrics.toProcess}
        />
      ),
      stock: <StockGauge stock={metrics.stock} />,
      sales: <SalesAreaChart monthly={metrics.monthly} money={money} />,
      "orders-week": <OrdersBarChart daily={metrics.daily} />,
      "recent-orders": <RecentOrdersTable orders={metrics.recentOrders} money={money.full} />,
    };
    body = (
      <div className={GRID_CLASS}>
        {layout.map((placement) => (
          <div key={placement.id} className={cn("flex min-w-0 flex-col [&>*]:flex-1", SPAN_CLASS[placement.span])}>
            {widgets[placement.id]}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      data-dashboard-theme={theme}
      className="@container -mx-4 -mb-6 min-h-[calc(100svh-4.75rem)] bg-dash-bg p-5 text-dash-text bg-[radial-gradient(ellipse_at_top_right,var(--dashboard-bg-glow),transparent_55%)] sm:-mx-6 lg:-mx-8 lg:p-8"
    >
      {body}
    </div>
  );
}

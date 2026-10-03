import { Package, ShoppingBag, UserPlus, Wallet, type LucideIcon } from "lucide-react";

import type { DashboardMetrics, Kpi } from "@/lib/dashboardMetrics";
import { CoachMark } from "@/components/ui/CoachMark";
import { DASHBOARD_CARD_CLASS } from "@/components/dashboard/overview/DashboardCard";
import { cn } from "cn";

function formatChange(change: number): string {
  const rounded = Math.round(change);
  return `${rounded > 0 ? "+" : ""}${rounded} %`;
}

/** Variation colorée par rapport au mois précédent. Sans base de
 * comparaison (mois précédent à 0), « nouveau » ou « — » : jamais de
 * pourcentage inventé. */
function Change({ kpi }: { kpi: Kpi }) {
  if (kpi.change === null) {
    return (
      <span className="text-dash-neutral">{kpi.value > 0 ? "nouveau" : "—"}</span>
    );
  }
  const tone =
    kpi.change > 0 ? "text-dash-positive" : kpi.change < 0 ? "text-dash-negative" : "text-dash-neutral";
  return <span className={cn("font-semibold", tone)}>{formatChange(kpi.change)}</span>;
}

function KpiCard({
  icon: Icon,
  label,
  value,
  detail,
  help,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: React.ReactNode;
  help: string;
}) {
  return (
    <div className={cn(DASHBOARD_CARD_CLASS, "flex min-w-0 items-center justify-between gap-3 p-4 lg:p-5")}>
      <div className="min-w-0">
        <p className="flex items-center gap-1 text-xs font-medium text-dash-muted">
          {label}
          <CoachMark label={`Aide : ${label}`}>{help}</CoachMark>
        </p>
        <p className="mt-1 truncate text-xl font-bold tabular-nums">{value}</p>
        <p className="mt-0.5 text-xs text-dash-subtle">{detail}</p>
      </div>
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-dash-icon-bg text-dash-icon-fg">
        <Icon className="size-5" aria-hidden />
      </span>
    </div>
  );
}

export function KpiRow({
  metrics,
  money,
}: {
  metrics: DashboardMetrics;
  money: (amountXaf: number) => string;
}) {
  const alerts = metrics.stock.low + metrics.stock.out;
  const vsLastMonth = (kpi: Kpi) => (
    <>
      <Change kpi={kpi} /> vs mois dernier
    </>
  );

  return (
    <div data-tour="stat-cards" className="grid grid-cols-1 gap-4 @lg:grid-cols-2 @5xl:grid-cols-4">
      <KpiCard
        icon={Wallet}
        label="Ventes du mois"
        value={money(metrics.revenue.value)}
        detail={vsLastMonth(metrics.revenue)}
        help="Montant des commandes de ce mois déjà livrées (argent encaissé). Les commandes en cours n'y sont pas encore."
      />
      <KpiCard
        icon={ShoppingBag}
        label="Commandes du mois"
        value={String(metrics.orders.value)}
        detail={vsLastMonth(metrics.orders)}
        help="Commandes passées ce mois-ci, quel que soit leur état, sauf les annulées."
      />
      <KpiCard
        icon={UserPlus}
        label="Nouveaux clients"
        value={String(metrics.newClients.value)}
        detail={vsLastMonth(metrics.newClients)}
        help="Clients avec un compte qui ont passé leur toute première commande chez vous ce mois-ci."
      />
      <KpiCard
        icon={Package}
        label="Produits actifs"
        value={String(metrics.activeProducts)}
        detail={
          alerts > 0 ? (
            <span className="text-dash-negative">
              {alerts} en alerte de stock
            </span>
          ) : (
            "Stocks à jour"
          )
        }
        help="Produits de votre catalogue (hors corbeille). « En alerte » : stock au seuil d'alerte ou épuisé."
      />
    </div>
  );
}

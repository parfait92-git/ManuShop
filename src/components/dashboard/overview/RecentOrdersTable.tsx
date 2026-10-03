import Link from "next/link";

import { DashboardCard, DashboardEmpty } from "@/components/dashboard/overview/DashboardCard";
import { ORDER_STATUS_LABEL } from "@/lib/orderStatus";
import type { Order } from "@/models/order/Order";
import type { OrderStatus } from "@/models/order/OrderStatus";

/** Ton de chaque statut : variables `--status-*` du thème. */
const STATUS_TONE: Record<OrderStatus, string> = {
  under_review: "text-[var(--status-pending)] bg-[var(--status-pending-bg)]",
  ready_for_delivery: "text-[var(--status-progress)] bg-[var(--status-progress-bg)]",
  delivering: "text-[var(--status-progress)] bg-[var(--status-progress-bg)]",
  delivered: "text-[var(--status-success)] bg-[var(--status-success-bg)]",
  returned: "text-[var(--status-muted)] bg-[var(--status-muted-bg)]",
  defective: "text-[var(--status-danger)] bg-[var(--status-danger-bg)]",
  cancelled: "text-[var(--status-muted)] bg-[var(--status-muted-bg)]",
};

const dateLabel = (order: Order) =>
  order.createdAt.toDate().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Douala",
  });

export function RecentOrdersTable({
  orders,
  money,
}: {
  orders: Order[];
  money: (amountXaf: number) => string;
}) {
  return (
    <DashboardCard
      title="Dernières commandes"
      subtitle="Les commandes reçues le plus récemment"
      dataTour="dashboard-recent-orders"
      action={
        <Link href="/dashboard/orders" className="shrink-0 text-sm font-semibold text-dash-accent hover:underline">
          Tout voir
        </Link>
      }
    >
      {orders.length === 0 ? (
        <DashboardEmpty>Aucune commande pour l&apos;instant.</DashboardEmpty>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-dash-row-border text-left text-xs font-semibold tracking-wide text-dash-table-header uppercase">
                <th className="py-2 pr-3 font-semibold">Client</th>
                <th className="py-2 pr-3 font-semibold">Articles</th>
                <th className="py-2 pr-3 text-right font-semibold">Montant</th>
                <th className="py-2 pr-3 font-semibold">Statut</th>
                <th className="py-2 text-right font-semibold">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const count = order.items.reduce((sum, item) => sum + item.quantity, 0);
                return (
                  <tr key={order.id} className="border-b border-dash-row-border last:border-0 hover:bg-dash-row-hover">
                    <td className="max-w-48 truncate py-3 pr-3 font-medium">{order.clientName}</td>
                    <td className="py-3 pr-3 text-dash-muted">
                      {count} article{count > 1 ? "s" : ""}
                    </td>
                    <td className="py-3 pr-3 text-right font-semibold tabular-nums">{money(order.total)}</td>
                    <td className="py-3 pr-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${STATUS_TONE[order.status]}`}>
                        {ORDER_STATUS_LABEL[order.status]}
                      </span>
                    </td>
                    <td className="py-3 text-right whitespace-nowrap text-dash-muted">{dateLabel(order)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </DashboardCard>
  );
}

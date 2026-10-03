import Link from "next/link";

import { DashboardCard, DashboardEmpty } from "@/components/dashboard/overview/DashboardCard";
import { useSvgId } from "@/components/dashboard/overview/chartTheme";
import type { StockSummary } from "@/lib/dashboardMetrics";

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** Arc de 270° (ouvert en bas), comme une jauge. */
const ARC = CIRCUMFERENCE * 0.75;

/** Part des produits au-dessus de leur seuil d'alerte. */
export function StockGauge({ stock }: { stock: StockSummary }) {
  const gradientId = useSvgId("stock-gauge");
  const rate = stock.rate ?? 0;
  const alerts = stock.low + stock.out;

  return (
    <DashboardCard title="Santé du stock" subtitle="Produits au-dessus du seuil d'alerte" dataTour="dashboard-stock-gauge">
      {stock.rate === null ? (
        <DashboardEmpty>Ajoutez vos premiers produits pour suivre votre stock.</DashboardEmpty>
      ) : (
        <>
          <div className="relative mx-auto aspect-square w-full max-w-48">
            <svg viewBox="0 0 128 128" className="size-full -rotate-[225deg]" aria-hidden>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="var(--gauge-fill)" />
                  <stop offset="100%" stopColor="var(--gauge-fill-end)" />
                </linearGradient>
              </defs>
              <circle
                cx="64"
                cy="64"
                r={RADIUS}
                fill="none"
                stroke="var(--gauge-track)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${ARC} ${CIRCUMFERENCE}`}
              />
              <circle
                cx="64"
                cy="64"
                r={RADIUS}
                fill="none"
                stroke={`url(#${gradientId})`}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${(ARC * rate) / 100} ${CIRCUMFERENCE}`}
              />
            </svg>
            <div
              role="meter"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(rate)}
              aria-label="Produits en stock"
              className="absolute inset-0 flex flex-col items-center justify-center"
            >
              <span className="text-3xl font-bold tabular-nums @xs:text-4xl">{Math.round(rate)} %</span>
              <span className="text-xs text-dash-muted">en stock</span>
            </div>
          </div>
          <dl className="grid grid-cols-3 gap-2 text-center text-xs">
            {[
              ["En stock", stock.inStock, "text-dash-positive"],
              ["Faible", stock.low, "text-[var(--status-warning)]"],
              ["Rupture", stock.out, "text-dash-negative"],
            ].map(([label, value, tone]) => (
              <div key={label as string} className="rounded-xl border border-dash-border px-2 py-2">
                <dt className="text-dash-muted">{label}</dt>
                <dd className={`mt-0.5 text-lg font-bold tabular-nums ${tone}`}>{value}</dd>
              </div>
            ))}
          </dl>
          {alerts > 0 && (
            <Link
              href="/dashboard/products"
              className="mt-auto rounded-lg bg-dash-accent px-3 py-2 text-center text-sm font-semibold text-dash-accent-foreground hover:opacity-90"
            >
              Réapprovisionner {alerts} article{alerts > 1 ? "s" : ""}
            </Link>
          )}
        </>
      )}
    </DashboardCard>
  );
}

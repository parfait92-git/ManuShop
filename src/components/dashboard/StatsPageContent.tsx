"use client";

import { BarChart3, Info } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { cn } from "cn";

import { CoachMark } from "@/components/ui/CoachMark";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  STICKY_COLUMN_CONTENT,
  ScrollableTable,
} from "@/components/ui/scrollable-table";
import {
  computeProfitReport,
  computeStockValue,
  customPeriod,
  presetPeriod,
  type PeriodPreset,
  type ProfitGroup,
} from "@/lib/profitReport";
import type { Order } from "@/models/order/Order";
import type { OrderCost } from "@/models/order/OrderCost";
import type { Product } from "@/models/product/Product";
import type { ProductCost } from "@/models/product/ProductCost";
import { costService } from "@/services/CostService";
import { orderService } from "@/services/OrderService";
import { productService } from "@/services/ProductService";

const PRESETS: { id: PeriodPreset; label: string }[] = [
  { id: "week", label: "Cette semaine" },
  { id: "month", label: "Ce mois" },
  { id: "year", label: "Cette année" },
  { id: "custom", label: "Période personnalisée" },
];

type Breakdown = "product" | "category" | "week" | "month";

const BREAKDOWNS: { id: Breakdown; label: string; column: string }[] = [
  { id: "product", label: "Par article", column: "Article" },
  { id: "category", label: "Par catégorie", column: "Catégorie" },
  { id: "week", label: "Par semaine", column: "Semaine" },
  { id: "month", label: "Par mois", column: "Mois" },
];

function money(amount: number): string {
  return `${Math.round(amount).toLocaleString("fr-FR")} FCFA`;
}

function percent(rate: number | null): string {
  return rate === null ? "—" : `${Math.round(rate * 100)} %`;
}

/** "2026-10-02" du jour, au Cameroun — valeur initiale des champs date. */
function todayInput(): string {
  return new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 10);
}

interface StatsData {
  orders: Order[];
  orderCosts: OrderCost[];
  productCosts: ProductCost[];
  products: Product[];
}

function KpiCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "positive" | "negative";
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-shell-border bg-shell-surface p-4">
      <p className="flex items-center gap-1.5 text-sm text-shell-subtle">
        {label}
        <CoachMark label={`Aide : ${label}`}>{hint}</CoachMark>
      </p>
      <p
        className={cn(
          "text-xl font-semibold text-shell-text",
          tone === "positive" && "text-emerald-700",
          tone === "negative" && "text-red-600"
        )}
      >
        {value}
      </p>
    </div>
  );
}

/**
 * Gains de la boutique (prix de vente − prix d'achat) sur une période, par
 * article, catégorie, semaine et mois, et valeur du stock au prix d'achat.
 * Réservé au gérant (`/dashboard/stats`, `allowedRoles={["admin"]}`) — les
 * calculs eux-mêmes sont dans `src/lib/profitReport.ts`.
 */
export function StatsPageContent({ shopId }: { shopId: string }) {
  const [data, setData] = useState<StatsData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [preset, setPreset] = useState<PeriodPreset>("month");
  const [customFrom, setCustomFrom] = useState(() => todayInput().slice(0, 8) + "01");
  const [customTo, setCustomTo] = useState(todayInput);
  const [breakdown, setBreakdown] = useState<Breakdown>("product");

  useEffect(() => {
    let active = true;
    Promise.all([
      orderService.listByShop(shopId),
      costService.listOrderCosts(shopId),
      costService.listProductCosts(shopId),
      // Produits mis à la corbeille compris : leurs ventes passées restent
      // dans les gains, avec leur nom et leur catégorie.
      productService.listProducts(shopId),
    ])
      .then(([orders, orderCosts, productCosts, products]) => {
        if (active) setData({ orders, orderCosts, productCosts, products });
      })
      .catch(() => {
        if (active) setLoadError(true);
      });
    return () => {
      active = false;
    };
  }, [shopId]);

  const customInvalid = preset === "custom" && (!customFrom || !customTo || customFrom > customTo);

  const report = useMemo(() => {
    if (!data || customInvalid) return null;
    const period =
      preset === "custom" ? customPeriod(customFrom, customTo) : presetPeriod(preset);
    return computeProfitReport({ ...data, period });
  }, [data, preset, customFrom, customTo, customInvalid]);

  const stock = useMemo(
    () =>
      data
        ? computeStockValue(
            data.products.filter((p) => !p.deletedAt),
            data.productCosts
          )
        : null,
    [data]
  );

  if (loadError) {
    return (
      <p className="text-sm text-destructive">
        Impossible de charger vos statistiques. Vérifiez votre connexion et
        rechargez la page.
      </p>
    );
  }
  if (!data || !stock) {
    return <p className="text-sm text-muted-foreground">Chargement...</p>;
  }

  const rows: ProfitGroup[] = report
    ? {
        product: report.byProduct,
        category: report.byCategory,
        week: report.byWeek,
        month: report.byMonth,
      }[breakdown]
    : [];
  const column = BREAKDOWNS.find((b) => b.id === breakdown)!.column;
  const totals = report?.totals;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-shell-text sm:text-3xl">
          Gains et statistiques
        </h1>
        <p className="mt-1 text-sm text-shell-subtle">
          Ce que vous rapportent vos ventes livrées, une fois le prix d&apos;achat
          déduit.
        </p>
      </div>

      <section
        data-tour="stats-period"
        aria-label="Période"
        className="flex flex-col gap-3 rounded-xl border border-shell-border bg-shell-surface p-4"
      >
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={preset === option.id}
              onClick={() => setPreset(option.id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-medium",
                preset === option.id
                  ? "border-shell-active bg-shell-active text-shell-active-text"
                  : "border-shell-border text-shell-muted hover:bg-shell-hover"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        {preset === "custom" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:max-w-md">
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="stats-from"
                help="Premier jour inclus dans le calcul (à votre heure locale)."
              >
                Du
              </Label>
              <Input
                id="stats-from"
                type="date"
                value={customFrom}
                max={customTo || undefined}
                onChange={(event) => setCustomFrom(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="stats-to"
                help="Dernier jour inclus dans le calcul : ses ventes comptent jusqu'à minuit."
              >
                Au
              </Label>
              <Input
                id="stats-to"
                type="date"
                value={customTo}
                min={customFrom || undefined}
                onChange={(event) => setCustomTo(event.target.value)}
              />
            </div>
            {customInvalid && (
              <p className="text-sm text-destructive sm:col-span-2">
                Choisissez une date de début antérieure ou égale à la date de fin.
              </p>
            )}
          </div>
        )}
      </section>

      {totals && report && (
        <>
          <div data-tour="stats-totals" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Chiffre d'affaires"
              value={money(totals.revenue)}
              hint="Total encaissé sur les commandes livrées de la période. Les commandes en cours, annulées ou retournées ne comptent pas."
            />
            <KpiCard
              label="Coût d'achat"
              value={money(totals.cost)}
              hint="Ce que vous ont coûté les articles vendus, d'après leur prix d'achat. Les articles sans prix d'achat n'y figurent pas."
            />
            <KpiCard
              label="Gain"
              value={money(totals.gain)}
              tone={totals.gain < 0 ? "negative" : totals.gain > 0 ? "positive" : undefined}
              hint="Chiffre d'affaires moins coût d'achat, sur les articles dont le prix d'achat est connu. C'est ce que vos ventes vous ont rapporté."
            />
            <KpiCard
              label="Marge"
              value={percent(totals.marginRate)}
              hint="La part du prix de vente qui vous reste en gain. Exemple : 30 % signifie que sur 10 000 FCFA vendus, 3 000 FCFA sont du gain."
            />
          </div>

          <p className="text-sm text-shell-subtle">
            {report.ordersCount} commande{report.ordersCount > 1 ? "s" : ""} livrée
            {report.ordersCount > 1 ? "s" : ""} · {totals.quantity} article
            {totals.quantity > 1 ? "s" : ""} vendu{totals.quantity > 1 ? "s" : ""}
          </p>

          {(totals.estimatedLines > 0 || totals.unknownLines > 0) && (
            <div
              role="status"
              className="flex gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
            >
              <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <div className="flex flex-col gap-1">
                {totals.estimatedLines > 0 && (
                  <p>
                    {totals.estimatedLines} vente{totals.estimatedLines > 1 ? "s" : ""}{" "}
                    antérieure{totals.estimatedLines > 1 ? "s" : ""} au prix d&apos;achat :
                    gain estimé avec le prix d&apos;achat actuel.
                  </p>
                )}
                {totals.unknownLines > 0 && (
                  <p>
                    {totals.unknownLines} vente{totals.unknownLines > 1 ? "s" : ""} sans
                    prix d&apos;achat : comptée{totals.unknownLines > 1 ? "s" : ""} dans le
                    chiffre d&apos;affaires mais pas dans le gain.{" "}
                    <Link href="/dashboard/products" className="font-medium underline">
                      Renseigner les prix d&apos;achat
                    </Link>
                  </p>
                )}
              </div>
            </div>
          )}

          <section
            data-tour="stats-breakdown"
            aria-label="Détail des gains"
            className="flex flex-col gap-4 rounded-xl border border-shell-border bg-shell-surface p-4 sm:p-6"
          >
            <div className="flex flex-wrap gap-2">
              {BREAKDOWNS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={breakdown === option.id}
                  onClick={() => setBreakdown(option.id)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm font-medium",
                    breakdown === option.id
                      ? "bg-shell-accent-soft text-shell-accent"
                      : "text-shell-subtle hover:bg-shell-hover"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {rows.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <BarChart3 aria-hidden className="size-8 text-shell-faint" />
                <p className="text-sm text-shell-subtle">
                  Aucune vente livrée sur cette période.
                </p>
              </div>
            ) : (
              <ScrollableTable label={`Gains ${BREAKDOWNS.find((b) => b.id === breakdown)!.label.toLowerCase()}`} className="-mx-4 sm:-mx-6">
                <table className="w-full min-w-160 border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-shell-border text-left text-xs font-semibold tracking-wide text-shell-subtle uppercase">
                      <th className="px-3 py-2 sm:px-6">{column}</th>
                      <th className="px-4 py-2 text-right">Vendus</th>
                      <th className="px-4 py-2 text-right">Chiffre d&apos;affaires</th>
                      <th className="px-4 py-2 text-right">Coût</th>
                      <th className="px-4 py-2 text-right">Gain</th>
                      <th className="px-4 py-2 text-right sm:pr-6">Marge</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-shell-border">
                    {rows.map((row) => (
                      <tr key={row.key}>
                        <td className="px-3 py-3 sm:px-6">
                          <div className={STICKY_COLUMN_CONTENT}>
                            <p className="font-medium text-shell-text">{row.label}</p>
                            {(row.estimatedLines > 0 || row.unknownLines > 0) && (
                              <p className="text-xs text-amber-700">
                                {row.unknownLines > 0 ? "Prix d'achat manquant" : "Gain estimé"}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap text-shell-muted">
                          {row.quantity}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap text-shell-muted">
                          {money(row.revenue)}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap text-shell-muted">
                          {row.revenueWithCost > 0 ? money(row.cost) : "—"}
                        </td>
                        <td
                          className={cn(
                            "px-4 py-3 text-right font-medium whitespace-nowrap",
                            row.revenueWithCost === 0
                              ? "text-shell-subtle"
                              : row.gain < 0
                                ? "text-red-600"
                                : "text-emerald-700"
                          )}
                        >
                          {row.revenueWithCost > 0 ? money(row.gain) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap text-shell-muted sm:pr-6">
                          {percent(row.marginRate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollableTable>
            )}
          </section>
        </>
      )}

      <section
        data-tour="stats-stock"
        aria-label="Valeur du stock"
        className="flex flex-col gap-1 rounded-xl border border-shell-border bg-shell-surface p-4"
      >
        <p className="flex items-center gap-1.5 text-sm text-shell-subtle">
          Valeur du stock au prix d&apos;achat
          <CoachMark label="Aide : valeur du stock">
            Ce que vous a coûté la marchandise encore en rayon (quantité en stock ×
            prix d&apos;achat). Elle ne dépend pas de la période choisie.
          </CoachMark>
        </p>
        <p className="text-xl font-semibold text-shell-text">{money(stock.value)}</p>
        {stock.productsWithoutCost > 0 && (
          <p className="text-sm text-amber-700">
            {stock.productsWithoutCost} produit{stock.productsWithoutCost > 1 ? "s" : ""} en
            stock sans prix d&apos;achat, non compté{stock.productsWithoutCost > 1 ? "s" : ""}.
          </p>
        )}
      </section>
    </div>
  );
}

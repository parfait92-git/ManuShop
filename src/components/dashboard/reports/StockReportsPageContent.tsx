"use client";

import { FileDown, FileSpreadsheet, Loader2, PackageMinus, Warehouse } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { downloadCsv, downloadPdf } from "@/components/dashboard/reports/downloadReport";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { CoachMark } from "@/components/ui/CoachMark";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollableTable } from "@/components/ui/scrollable-table";
import { Select } from "@/components/ui/select";
import { useCurrentShop } from "@/hooks/useCurrentShop";
import { useShopTheme } from "@/hooks/useShopTheme";
import { formatDateTime } from "@/lib/dateTime";
import { resolveInvoiceColor } from "@/lib/invoice";
import { customPeriod, presetPeriod, type Period } from "@/lib/profitReport";
import {
  buildStockOutflowReport,
  buildStockStateReport,
  stockOutflowTable,
  stockOutflowTotals,
  stockStateTable,
  stockStateTotals,
  type ReportTable,
} from "@/lib/stockReport";
import type { Order } from "@/models/order/Order";
import type { Product } from "@/models/product/Product";
import { costService } from "@/services/CostService";
import { orderService } from "@/services/OrderService";
import { productService } from "@/services/ProductService";

type ReportKind = "state" | "outflow";
type PeriodChoice = "week" | "month" | "year" | "custom";

const PERIOD_LABEL: Record<PeriodChoice, string> = {
  week: "Cette semaine",
  month: "Ce mois",
  year: "Cette année",
  custom: "Période personnalisée",
};

/** Aperçu à l'écran : les premières lignes ; les fichiers contiennent tout. */
const PREVIEW_ROWS = 25;

const dayLabel = (date: Date) =>
  date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

/** « 2026-10-01 », date locale de l'utilisateur (pas la date UTC). */
const shopDay = (date: Date) => date.toLocaleDateString("sv-SE");

function slug(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Rapports de stock (2026-10-03) : état du stock à date, ou sorties de
 * stock sur une période, avec aperçu et téléchargement en PDF (aux
 * couleurs de la boutique) ou en CSV (tableur). Prix d'achat et valeur au
 * coût : gérant seulement.
 */
export function StockReportsPageContent({ shopId }: { shopId: string }) {
  const { profile } = useAuth();
  const isManager = profile?.role === "admin";
  const { shop } = useCurrentShop();
  const { theme } = useShopTheme(shopId);

  const [data, setData] = useState<{ products: Product[]; orders: Order[]; costs: Map<string, number> | null } | null>(
    null
  );
  const [loadError, setLoadError] = useState(false);
  const [kind, setKind] = useState<ReportKind>("state");
  const [periodChoice, setPeriodChoice] = useState<PeriodChoice>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [busy, setBusy] = useState<"pdf" | "csv" | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      productService.listActive(shopId),
      orderService.listByShop(shopId),
      isManager
        ? costService
            .listProductCosts(shopId)
            .then((list) => new Map(list.map((c) => [c.productId, c.purchasePrice])))
        : Promise.resolve(null),
    ])
      .then(([products, orders, costs]) => active && setData({ products, orders, costs }))
      .catch(() => active && setLoadError(true));
    return () => {
      active = false;
    };
  }, [shopId, isManager]);

  const period: Period | null = useMemo(() => {
    if (periodChoice !== "custom") return presetPeriod(periodChoice);
    if (!customFrom || !customTo || customFrom > customTo) return null;
    return customPeriod(customFrom, customTo);
  }, [periodChoice, customFrom, customTo]);

  const generatedAt = new Date();
  const report = useMemo(() => {
    if (!data) return null;
    if (kind === "state") {
      const state = buildStockStateReport(data.products, data.costs);
      return {
        title: "État du stock",
        subtitle: `Situation au ${formatDateTime(generatedAt, "long")}`,
        table: (money: boolean): ReportTable => stockStateTable(state, !!data.costs, money),
        totals: stockStateTotals(state),
        file: `etat-du-stock-${shopDay(generatedAt)}`,
      };
    }
    if (!period) return null;
    const outflow = buildStockOutflowReport(data.orders, data.products, period);
    const last = new Date(period.to.getTime() - 1);
    return {
      title: "Sorties de stock",
      subtitle: `Du ${dayLabel(period.from)} au ${dayLabel(last)}`,
      table: (): ReportTable => stockOutflowTable(outflow),
      totals: stockOutflowTotals(outflow),
      file: `sorties-de-stock-${shopDay(period.from)}-au-${shopDay(last)}`,
    };
    // `generatedAt` change à chaque rendu : l'horodatage suit les données.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, kind, period]);

  if (loadError) return <p className="text-sm text-destructive">Impossible de charger les données du stock.</p>;
  if (!data) return <p className="text-sm text-shell-subtle">Chargement...</p>;

  const shopName = shop?.name ?? "Ma boutique";
  const color = resolveInvoiceColor(shop?.themeColor, theme.invoiceColor);
  const preview = report?.table(true);

  async function handleDownload(format: "pdf" | "csv") {
    if (!report) return;
    setBusy(format);
    const filename = `${report.file}-${slug(shopName)}.${format}`;
    try {
      if (format === "csv") {
        downloadCsv({ table: report.table(false) }, filename);
      } else {
        await downloadPdf(
          {
            title: report.title,
            shopName,
            subtitle: report.subtitle,
            generatedAt: formatDateTime(new Date()),
            color,
            table: report.table(true),
            totals: report.totals,
          },
          filename
        );
      }
    } catch {
      toast.error("Le rapport n'a pas pu être généré. Réessayez.");
    } finally {
      setBusy(null);
    }
  }

  const kinds: { id: ReportKind; label: string; help: string; icon: typeof Warehouse }[] = [
    {
      id: "state",
      label: "État du stock",
      help: isManager
        ? "Chaque article à cette heure : stock, seuil d'alerte, statut, prix et valeur du stock (au prix de vente et au prix d'achat)."
        : "Chaque article à cette heure : stock, seuil d'alerte, statut, prix et valeur du stock au prix de vente.",
      icon: Warehouse,
    },
    {
      id: "outflow",
      label: "Sorties de stock",
      help: "Sur une période : quantités commandées, livrées et remises en stock (annulations, retours, défauts) pour chaque article.",
      icon: PackageMinus,
    },
  ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-shell-text">Rapports de stock</h1>
        <p className="mt-1 text-sm text-shell-subtle">
          Générez l&apos;état de votre stock ou ses sorties sur une période, en PDF pour l&apos;imprimer
          ou le partager, ou en CSV pour l&apos;ouvrir dans un tableur.
        </p>
      </div>

      <div data-tour="reports-kind" role="radiogroup" aria-label="Rapport" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {kinds.map(({ id, label, help, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={kind === id}
            onClick={() => setKind(id)}
            className={`flex items-start gap-3 rounded-xl border p-4 text-left ${
              kind === id ? "border-shell-active bg-shell-surface ring-2 ring-shell-active/30" : "border-shell-border bg-shell-surface hover:bg-shell-hover"
            }`}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-shell-accent-soft text-shell-accent">
              <Icon className="size-5" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold text-shell-text">{label}</span>
              <span className="block text-sm text-shell-subtle">{help}</span>
            </span>
          </button>
        ))}
      </div>

      {kind === "outflow" && (
        <div data-tour="reports-period" className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="report-period" help="Les commandes sont comptées selon leur date de création, à votre heure locale.">
              Période
            </Label>
            <Select id="report-period" value={periodChoice} onChange={(e) => setPeriodChoice(e.target.value as PeriodChoice)}>
              {(Object.keys(PERIOD_LABEL) as PeriodChoice[]).map((p) => (
                <option key={p} value={p}>
                  {PERIOD_LABEL[p]}
                </option>
              ))}
            </Select>
          </div>
          {periodChoice === "custom" && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="report-from">Du</Label>
                <Input id="report-from" type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="report-to">Au</Label>
                <Input id="report-to" type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
              </div>
            </>
          )}
        </div>
      )}

      {!report || !preview ? (
        <p className="rounded-lg border border-dashed border-shell-border p-6 text-center text-sm text-shell-subtle">
          Choisissez les dates de début et de fin de la période.
        </p>
      ) : (
        <section
          data-tour="reports-preview"
          aria-label="Aperçu du rapport"
          className="flex flex-col gap-4 overflow-hidden rounded-xl border border-shell-border bg-shell-surface p-4 sm:p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-shell-text">{report.title}</h2>
              <p className="text-sm text-shell-subtle">{report.subtitle}</p>
            </div>
            <div data-tour="reports-download" className="flex flex-wrap gap-2">
              <Button type="button" disabled={busy !== null} onClick={() => handleDownload("pdf")} className="gap-1.5">
                {busy === "pdf" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <FileDown className="size-4" aria-hidden />}
                Télécharger en PDF
              </Button>
              <Button type="button" variant="outline" disabled={busy !== null} onClick={() => handleDownload("csv")} className="gap-1.5">
                <FileSpreadsheet className="size-4" aria-hidden />
                Télécharger en CSV
              </Button>
              <CoachMark label="Aide : formats">
                PDF : prêt à imprimer ou à envoyer, aux couleurs de votre boutique. CSV : s&apos;ouvre dans
                Excel ou un tableur, avec des montants en nombres pour vos propres calculs.
              </CoachMark>
            </div>
          </div>

          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {report.totals.map(([label, value]) => (
              <div key={label} className="rounded-lg border border-shell-border p-3">
                <dt className="text-xs text-shell-subtle">{label}</dt>
                <dd className="mt-0.5 font-semibold break-words text-shell-text">{value}</dd>
              </div>
            ))}
          </dl>

          {preview.rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-shell-subtle">Aucune donnée pour ce rapport.</p>
          ) : (
            <ScrollableTable label="Aperçu du rapport">
              <table className="w-full min-w-160 border-collapse text-sm">
                <thead>
                  <tr className="border-b border-shell-border text-left text-xs font-semibold tracking-wide text-shell-subtle uppercase">
                    {preview.headers.map((h, i) => (
                      <th key={h} className={`px-3 py-2 ${preview.numeric[i] ? "text-right" : ""}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.slice(0, PREVIEW_ROWS).map((row, r) => (
                    <tr key={r} className="border-b border-shell-border last:border-0">
                      {row.map((value, i) => (
                        <td key={i} className={`px-3 py-2 text-shell-text ${preview.numeric[i] ? "text-right whitespace-nowrap" : ""}`}>
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollableTable>
          )}
          {preview.rows.length > PREVIEW_ROWS && (
            <p className="text-sm text-shell-subtle">
              Aperçu des {PREVIEW_ROWS} premières lignes sur {preview.rows.length} : les fichiers les contiennent toutes.
            </p>
          )}
        </section>
      )}
    </div>
  );
}

/**
 * Rapports de stock du commerçant (2026-10-03), sans lecture Firestore :
 * la page Rapports charge produits, prix d'achat et commandes, ce module
 * les met en forme pour l'écran, le PDF et le CSV.
 *
 * Deux rapports :
 * - **État du stock**, à la date de génération : chaque produit actif, son
 *   stock, son seuil d'alerte, son statut, sa valeur. Prix d'achat et
 *   valeur au prix d'achat réservés au gérant (comme `productCosts`).
 * - **Sorties de stock** sur une période : quantités commandées, livrées
 *   et remises en stock (annulation, retour, défaut), d'après les
 *   commandes — datées par leur création, comme la page Statistiques.
 * - **Mouvements de stock** sur une période (BF-15) : chaque entrée et
 *   sortie inscrite dans l'historique (commandes, réapprovisionnements,
 *   corrections d'inventaire), dans l'ordre chronologique.
 *
 * Montants en FCFA, la devise de référence des prix saisis.
 */

import { formatDateTime } from "@/lib/dateTime";
import type { Period } from "@/lib/profitReport";
import type { Order } from "@/models/order/Order";
import type { Product } from "@/models/product/Product";
import { STOCK_MOVEMENT_LABEL, type StockMovement } from "@/models/stock/StockMovement";
import { lineName, listVariants } from "@/lib/variants";

export type StockStatusLabel = "Rupture" | "Faible" | "En stock";

export function stockStatusLabel(product: Pick<Product, "stock" | "stockThreshold">): StockStatusLabel {
  if (product.stock <= 0) return "Rupture";
  if (product.stock <= product.stockThreshold) return "Faible";
  return "En stock";
}

/** Ordre d'affichage : ce qui demande une action d'abord. */
const STATUS_ORDER: Record<StockStatusLabel, number> = { Rupture: 0, Faible: 1, "En stock": 2 };

export interface StockStateRow {
  name: string;
  category: string;
  stock: number;
  threshold: number;
  status: StockStatusLabel;
  price: number;
  /** Gérant seulement ; `undefined` s'il n'est pas renseigné. */
  purchasePrice?: number;
  valueAtPrice: number;
  valueAtCost?: number;
  published: boolean;
}

export interface StockStateReport {
  rows: StockStateRow[];
  totals: {
    products: number;
    units: number;
    out: number;
    low: number;
    inStock: number;
    valueAtPrice: number;
    /** `null` pour un vendeur (prix d'achat non visibles). */
    valueAtCost: number | null;
    /** Produits en stock sans prix d'achat (valeur au coût incomplète). */
    missingCost: number;
  };
}

/**
 * État du stock. `costs` : prix d'achat par produit pour le gérant, `null`
 * pour un vendeur (les colonnes de coût ne sont alors pas produites).
 */
export function buildStockStateReport(
  products: Product[],
  costs: Map<string, number> | null
): StockStateReport {
  // Une ligne par version (BF-17), sinon une par produit. Prix de vente
  // hors promotion : la valeur du stock au tarif normal.
  const lines = products.flatMap((product) => {
    const variants = listVariants(product);
    if (variants.length === 0) return [{ product, name: product.name, stock: product.stock, price: product.price }];
    return variants.map((v) => ({ product, name: lineName(product.name, v.label), stock: v.stock, price: v.price ?? product.price }));
  });
  const rows = lines
    .map(({ product, name, stock: rawStock, price }) => {
      const stock = Math.max(rawStock, 0);
      const purchasePrice = costs?.get(product.id);
      return {
        name,
        category: product.category || "Sans catégorie",
        stock,
        threshold: product.stockThreshold,
        status: stockStatusLabel({ stock, stockThreshold: product.stockThreshold }),
        price,
        ...(costs ? { purchasePrice } : {}),
        valueAtPrice: stock * price,
        ...(costs && purchasePrice !== undefined ? { valueAtCost: stock * purchasePrice } : {}),
        published: product.isPublished !== false,
      } as StockStateRow;
    })
    .sort(
      (a, b) =>
        STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.name.localeCompare(b.name, "fr")
    );

  return {
    rows,
    totals: {
      products: products.length,
      units: rows.reduce((sum, r) => sum + r.stock, 0),
      out: rows.filter((r) => r.status === "Rupture").length,
      low: rows.filter((r) => r.status === "Faible").length,
      inStock: rows.filter((r) => r.status === "En stock").length,
      valueAtPrice: rows.reduce((sum, r) => sum + r.valueAtPrice, 0),
      valueAtCost: costs ? rows.reduce((sum, r) => sum + (r.valueAtCost ?? 0), 0) : null,
      missingCost: costs ? rows.filter((r) => r.stock > 0 && r.purchasePrice === undefined).length : 0,
    },
  };
}

export interface StockOutflowRow {
  name: string;
  category: string;
  /** Commandé : commandes de la période, sauf annulées. */
  ordered: number;
  /** Livré : commandes livrées (y compris retournées ou défectueuses
   * ensuite, qui ont bien quitté la boutique). */
  delivered: number;
  /** Remis en stock : annulées, retournées ou défectueuses. */
  restocked: number;
  /** Stock actuel ; `null` pour un produit supprimé depuis. */
  currentStock: number | null;
}

export interface StockOutflowReport {
  rows: StockOutflowRow[];
  totals: { orders: number; ordered: number; delivered: number; restocked: number };
}

const DELIVERED = new Set<Order["status"]>(["delivered", "returned", "defective"]);
const RESTOCKED = new Set<Order["status"]>(["cancelled", "returned", "defective"]);

export function buildStockOutflowReport(
  orders: Order[],
  products: Product[],
  period: Period
): StockOutflowReport {
  const byId = new Map(products.map((p) => [p.id, p]));
  const rows = new Map<string, StockOutflowRow>();
  let count = 0;

  for (const order of orders) {
    const ms = order.createdAt.toMillis();
    if (ms < period.from.getTime() || ms >= period.to.getTime()) continue;
    count += 1;
    for (const item of order.items) {
      const product = byId.get(item.productId);
      let row = rows.get(item.productId);
      if (!row) {
        row = {
          name: product?.name ?? item.name,
          category: product?.category || "Sans catégorie",
          ordered: 0,
          delivered: 0,
          restocked: 0,
          currentStock: product ? Math.max(product.stock, 0) : null,
        };
        rows.set(item.productId, row);
      }
      if (order.status !== "cancelled") row.ordered += item.quantity;
      if (DELIVERED.has(order.status)) row.delivered += item.quantity;
      if (RESTOCKED.has(order.status)) row.restocked += item.quantity;
    }
  }

  const list = [...rows.values()].sort((a, b) => b.ordered - a.ordered || a.name.localeCompare(b.name, "fr"));
  return {
    rows: list,
    totals: {
      orders: count,
      ordered: list.reduce((s, r) => s + r.ordered, 0),
      delivered: list.reduce((s, r) => s + r.delivered, 0),
      restocked: list.reduce((s, r) => s + r.restocked, 0),
    },
  };
}

export interface StockMovementsReport {
  movements: StockMovement[];
  totals: { movements: number; unitsIn: number; unitsOut: number; restocked: number; adjusted: number };
}

/** Mouvements de la période, du plus ancien au plus récent. Un mouvement
 * dont la date serveur n'est pas encore connue est laissé de côté. */
export function buildStockMovementsReport(movements: StockMovement[], period: Period): StockMovementsReport {
  const inPeriod = movements
    .filter((m) => {
      const ms = m.createdAt?.toMillis?.();
      return ms !== undefined && ms >= period.from.getTime() && ms < period.to.getTime();
    })
    .sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis());
  // Le stock de départ d'un produit n'est ni une entrée ni une sortie.
  const counted = inPeriod.filter((m) => m.type !== "initial");
  return {
    movements: inPeriod,
    totals: {
      movements: inPeriod.length,
      unitsIn: counted.reduce((s, m) => s + Math.max(m.quantity, 0), 0),
      unitsOut: counted.reduce((s, m) => s + Math.max(-m.quantity, 0), 0),
      restocked: inPeriod.filter((m) => m.type === "restock").reduce((s, m) => s + m.quantity, 0),
      adjusted: inPeriod.filter((m) => m.type === "adjustment").reduce((s, m) => s + m.quantity, 0),
    },
  };
}

/** Tableau prêt à exporter : en-têtes et cellules en texte ou nombre. */
export interface ReportTable {
  headers: string[];
  rows: (string | number)[][];
  /** Colonnes alignées à droite (nombres, montants). */
  numeric: boolean[];
}

const fcfa = (n: number) => `${Math.round(n).toLocaleString("fr-FR").replace(/[  ]/g, " ")} FCFA`;

/** État du stock → tableau. `money` : montants mis en forme (PDF, écran)
 * ou nombres bruts (CSV, pour les calculs dans un tableur). */
export function stockStateTable(report: StockStateReport, withCost: boolean, money: boolean): ReportTable {
  const amount = (n: number | undefined) => (n === undefined ? "" : money ? fcfa(n) : Math.round(n));
  const headers = ["Article", "Catégorie", "Stock", "Seuil", "Statut", "Prix de vente"];
  const numeric = [false, false, true, true, false, true];
  if (withCost) {
    headers.push("Prix d'achat", "Valeur (achat)");
    numeric.push(true, true);
  }
  headers.push("Valeur (vente)", "Publié");
  numeric.push(true, false);
  return {
    headers,
    numeric,
    rows: report.rows.map((r) => [
      r.name,
      r.category,
      r.stock,
      r.threshold,
      r.status,
      amount(r.price),
      ...(withCost ? [amount(r.purchasePrice), amount(r.valueAtCost)] : []),
      amount(r.valueAtPrice),
      r.published ? "Oui" : "Non",
    ]),
  };
}

export function stockOutflowTable(report: StockOutflowReport): ReportTable {
  return {
    headers: ["Article", "Catégorie", "Commandé", "Livré", "Remis en stock", "Stock actuel"],
    numeric: [false, false, true, true, true, true],
    rows: report.rows.map((r) => [
      r.name,
      r.category,
      r.ordered,
      r.delivered,
      r.restocked,
      r.currentStock ?? "Supprimé",
    ]),
  };
}

/** `display` : variation signée « +6 » (PDF, écran) ; sinon nombre brut
 * (CSV, pour les calculs dans un tableur). */
export function stockMovementsTable(report: StockMovementsReport, display: boolean): ReportTable {
  return {
    headers: ["Date", "Article", "Mouvement", "Variation", "Stock après", "Par", "Commande / note"],
    numeric: [false, false, false, true, true, false, false],
    rows: report.movements.map((m) => [
      formatDateTime(m.createdAt.toDate()),
      m.productName,
      STOCK_MOVEMENT_LABEL[m.type],
      display && m.type !== "initial" && m.quantity > 0 ? `+${m.quantity}` : m.quantity,
      m.stockAfter,
      m.actorName ?? (m.type === "order" ? "Client" : ""),
      [m.orderId ? `Commande ${m.orderId.slice(0, 8).toUpperCase()}` : "", m.note ?? ""].filter(Boolean).join(" — "),
    ]),
  };
}

const signedUnits = (n: number) => (n > 0 ? `+${n}` : String(n));

export function stockMovementsTotals(report: StockMovementsReport): [string, string][] {
  const t = report.totals;
  return [
    ["Mouvements", String(t.movements)],
    ["Unités entrées", String(t.unitsIn)],
    ["Unités sorties", String(t.unitsOut)],
    ["Dont réapprovisionnements", String(t.restocked)],
    ["Écart des corrections d'inventaire", signedUnits(t.adjusted)],
  ];
}

/** Lignes de totaux affichées à la fin du rapport. */
export function stockStateTotals(report: StockStateReport): [string, string][] {
  const t = report.totals;
  return [
    ["Produits", String(t.products)],
    ["Unités en stock", String(t.units)],
    ["En rupture / stock faible", `${t.out} / ${t.low}`],
    ["Valeur au prix de vente", fcfa(t.valueAtPrice)],
    ...(t.valueAtCost !== null
      ? ([
          [
            "Valeur au prix d'achat",
            fcfa(t.valueAtCost) + (t.missingCost ? ` (${t.missingCost} sans prix d'achat)` : ""),
          ],
        ] as [string, string][])
      : []),
  ];
}

export function stockOutflowTotals(report: StockOutflowReport): [string, string][] {
  const t = report.totals;
  return [
    ["Commandes de la période", String(t.orders)],
    ["Unités commandées", String(t.ordered)],
    ["Unités livrées", String(t.delivered)],
    ["Unités remises en stock", String(t.restocked)],
  ];
}

/**
 * CSV pour Excel et les tableurs français : séparateur « ; », guillemets
 * doublés, fins de ligne CRLF, et marque BOM pour que les accents
 * s'affichent correctement à l'ouverture.
 */
export function toCsv(table: ReportTable): string {
  const cell = (value: string | number) => {
    const text = String(value);
    return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = [table.headers, ...table.rows].map((row) => row.map(cell).join(";"));
  return `﻿${lines.join("\r\n")}\r\n`;
}

import type { Order } from "@/models/order/Order";
import type { OrderCost } from "@/models/order/OrderCost";
import type { Product } from "@/models/product/Product";
import type { ProductCost } from "@/models/product/ProductCost";

/**
 * Calcul des gains (chiffre d'affaires − prix d'achat) d'une boutique sur
 * une période, sans aucune lecture Firestore : les données sont chargées
 * par la page Statistiques, ce module ne fait que les agréger.
 *
 * Règles (choisies avec l'utilisateur le 2026-10-02) :
 * - seules les commandes **livrées** comptent (argent réellement encaissé,
 *   paiement à la livraison) — même règle que « Ventes du mois » ;
 * - une vente est datée par la création de sa commande, comme sur le
 *   tableau de bord ;
 * - le coût d'une ligne est le prix d'achat **figé au moment de la vente**
 *   (`orderCosts`) ; à défaut (vente antérieure au prix d'achat), le prix
 *   d'achat actuel du produit, signalé comme estimation ; à défaut encore,
 *   la ligne compte dans le chiffre d'affaires mais pas dans le gain.
 */

/* Bornes de jour, semaine, mois et année dans le fuseau horaire de
 * l'appareil de l'utilisateur (2026-10-03, demande de l'utilisateur :
 * « le fuseau dépend d'où se trouve celui qui utilise la plateforme »).
 * Construites par composantes locales, donc justes aussi les jours de
 * changement d'heure. Les noms gardent « Shop » pour ne pas tout
 * renommer : il s'agit de l'heure locale de l'utilisateur. */

/** Début (inclus) du jour, heure locale. */
export function startOfShopDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Début (inclus) de la semaine, lundi, heure locale. */
export function startOfShopWeek(date: Date): Date {
  const weekday = (date.getDay() + 6) % 7; // lundi = 0
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - weekday);
}

/** Début (inclus) du mois, heure locale. */
export function startOfShopMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/** Début (inclus) de l'année, heure locale. */
export function startOfShopYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1);
}

/** "2026-10-02" (champ date) → début de ce jour, heure locale. */
export function shopDayFromInput(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** Lendemain (même heure locale), pour une borne de fin exclue. */
function nextDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
}

export type PeriodPreset = "week" | "month" | "year" | "custom";

/** Période [from, to[ — `to` exclu. */
export interface Period {
  from: Date;
  to: Date;
}

export function presetPeriod(preset: Exclude<PeriodPreset, "custom">, now: Date = new Date()): Period {
  const to = nextDay(startOfShopDay(now));
  const from =
    preset === "week"
      ? startOfShopWeek(now)
      : preset === "month"
        ? startOfShopMonth(now)
        : startOfShopYear(now);
  return { from, to };
}

/** Période personnalisée, bornes incluses ("du 1er au 15" compte le 15). */
export function customPeriod(fromInput: string, toInput: string): Period {
  return {
    from: shopDayFromInput(fromInput),
    to: nextDay(shopDayFromInput(toInput)),
  };
}

export type CostSource = "recorded" | "estimated" | "unknown";

export interface ProfitTotals {
  /** Chiffre d'affaires de toutes les lignes. */
  revenue: number;
  /** Chiffre d'affaires des seules lignes dont le coût est connu. */
  revenueWithCost: number;
  cost: number;
  /** `revenueWithCost − cost`. */
  gain: number;
  /** Gain / chiffre d'affaires avec coût connu ; `null` sans coût connu. */
  marginRate: number | null;
  quantity: number;
  /** Lignes dont le coût est le prix d'achat actuel (vente antérieure). */
  estimatedLines: number;
  /** Lignes sans aucun prix d'achat : hors du gain. */
  unknownLines: number;
}

export interface ProfitGroup extends ProfitTotals {
  key: string;
  label: string;
}

export interface ProfitReport {
  totals: ProfitTotals;
  ordersCount: number;
  byProduct: ProfitGroup[];
  byCategory: ProfitGroup[];
  byWeek: ProfitGroup[];
  byMonth: ProfitGroup[];
}

interface Line {
  productId: string;
  name: string;
  category: string;
  date: Date;
  quantity: number;
  revenue: number;
  cost: number | null;
  costSource: CostSource;
}

function emptyTotals(): ProfitTotals {
  return {
    revenue: 0,
    revenueWithCost: 0,
    cost: 0,
    gain: 0,
    marginRate: null,
    quantity: 0,
    estimatedLines: 0,
    unknownLines: 0,
  };
}

function addLine(totals: ProfitTotals, line: Line): void {
  totals.revenue += line.revenue;
  totals.quantity += line.quantity;
  if (line.cost === null) {
    totals.unknownLines += 1;
    return;
  }
  totals.revenueWithCost += line.revenue;
  totals.cost += line.cost;
  if (line.costSource === "estimated") totals.estimatedLines += 1;
}

function finish<T extends ProfitTotals>(totals: T): T {
  totals.gain = totals.revenueWithCost - totals.cost;
  totals.marginRate = totals.revenueWithCost > 0 ? totals.gain / totals.revenueWithCost : null;
  return totals;
}

function group(
  lines: Line[],
  keyOf: (line: Line) => string,
  labelOf: (line: Line) => string
): ProfitGroup[] {
  const groups = new Map<string, ProfitGroup>();
  for (const line of lines) {
    const key = keyOf(line);
    let current = groups.get(key);
    if (!current) {
      current = { key, label: labelOf(line), ...emptyTotals() };
      groups.set(key, current);
    }
    addLine(current, line);
  }
  return [...groups.values()].map(finish);
}

const WEEK_LABEL = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
});
const MONTH_LABEL = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
});

export function computeProfitReport({
  orders,
  orderCosts,
  productCosts,
  products,
  period,
}: {
  orders: Order[];
  orderCosts: OrderCost[];
  productCosts: ProductCost[];
  products: Product[];
  period: Period;
}): ProfitReport {
  const costsByOrder = new Map(orderCosts.map((c) => [c.orderId, c]));
  const currentCost = new Map(productCosts.map((c) => [c.productId, c.purchasePrice]));
  const productById = new Map(products.map((p) => [p.id, p]));

  const delivered = orders.filter((order) => {
    if (order.status !== "delivered") return false;
    const date = order.createdAt.toDate();
    return date >= period.from && date < period.to;
  });

  const lines: Line[] = delivered.flatMap((order) => {
    // Une remise de commande se répartit au prorata des lignes.
    const discountFactor = order.subtotal > 0 ? order.total / order.subtotal : 1;
    const recorded = costsByOrder.get(order.id)?.items ?? [];
    return order.items.map((item, index) => {
      const product = productById.get(item.productId);
      const recordedCost =
        recorded[index]?.productId === item.productId ? recorded[index].unitCost : undefined;
      const estimatedCost = currentCost.get(item.productId);
      const unitCost = recordedCost ?? estimatedCost;
      const costSource: CostSource =
        recordedCost !== undefined ? "recorded" : estimatedCost !== undefined ? "estimated" : "unknown";
      return {
        productId: item.productId,
        name: product?.name ?? item.name,
        category: product?.category || "Sans catégorie",
        date: order.createdAt.toDate(),
        quantity: item.quantity,
        revenue: item.unitPrice * item.quantity * discountFactor,
        cost: unitCost === undefined ? null : unitCost * item.quantity,
        costSource,
      };
    });
  });

  const totals = emptyTotals();
  lines.forEach((line) => addLine(totals, line));

  const byGain = (a: ProfitGroup, b: ProfitGroup) => b.gain - a.gain || b.revenue - a.revenue;
  const chronological = (a: ProfitGroup, b: ProfitGroup) => a.key.localeCompare(b.key);

  return {
    totals: finish(totals),
    ordersCount: delivered.length,
    byProduct: group(lines, (l) => l.productId, (l) => l.name).sort(byGain),
    byCategory: group(lines, (l) => l.category, (l) => l.category).sort(byGain),
    byWeek: group(
      lines,
      (l) => startOfShopWeek(l.date).toISOString(),
      (l) => `Semaine du ${WEEK_LABEL.format(startOfShopWeek(l.date))}`
    ).sort(chronological),
    byMonth: group(
      lines,
      (l) => startOfShopMonth(l.date).toISOString(),
      (l) => MONTH_LABEL.format(startOfShopMonth(l.date))
    ).sort(chronological),
  };
}

/** Valeur du stock au prix d'achat — utile pour savoir combien d'argent
 * dort en rayon. Les produits sans prix d'achat sont comptés à part. */
export function computeStockValue(
  products: Product[],
  productCosts: ProductCost[]
): { value: number; productsWithoutCost: number } {
  const currentCost = new Map(productCosts.map((c) => [c.productId, c.purchasePrice]));
  let value = 0;
  let productsWithoutCost = 0;
  for (const product of products) {
    if (product.stock <= 0) continue;
    const cost = currentCost.get(product.id);
    if (cost === undefined) productsWithoutCost += 1;
    else value += cost * product.stock;
  }
  return { value, productsWithoutCost };
}

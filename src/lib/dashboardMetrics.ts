/**
 * Chiffres de l'accueil du tableau de bord (refonte du 2026-10-03), sans
 * aucune lecture Firestore : les commandes et produits de la boutique sont
 * chargés par `useDashboardData`, ce module ne fait que les agréger.
 *
 * Mêmes règles que la page Statistiques (`profitReport.ts`) :
 * - le chiffre d'affaires ne compte que les commandes **livrées** (argent
 *   réellement encaissé, paiement à la livraison) ;
 * - une vente est datée par la création de sa commande ;
 * - jours et mois à l'heure locale de l'utilisateur (son appareil).
 */

import { startOfShopDay, startOfShopMonth } from "@/lib/profitReport";
import type { Order } from "@/models/order/Order";
import type { Product } from "@/models/product/Product";


/** Commandes qui n'ont jamais abouti : exclues des comptes de commandes. */
const NOT_COUNTED = new Set<Order["status"]>(["cancelled"]);

const TO_PROCESS = new Set<Order["status"]>(["under_review", "ready_for_delivery", "delivering"]);

const orderMs = (order: Order) => order.createdAt.toMillis();

/** Début du mois suivant (ou précédent, `delta` négatif), heure locale. */
function shiftMonth(monthStart: Date, delta: number): Date {
  return new Date(monthStart.getFullYear(), monthStart.getMonth() + delta, 1);
}

function inRange(order: Order, from: Date, to: Date): boolean {
  const ms = orderMs(order);
  return ms >= from.getTime() && ms < to.getTime();
}

const revenueOf = (orders: Order[]) =>
  orders.filter((o) => o.status === "delivered").reduce((sum, o) => sum + o.total, 0);

const countOf = (orders: Order[]) => orders.filter((o) => !NOT_COUNTED.has(o.status)).length;

/**
 * Variation en % d'une période à la précédente. `null` quand elle n'a pas
 * de sens (période précédente à 0) : on n'affiche jamais « +∞ % ».
 */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export interface Kpi {
  value: number;
  previous: number;
  change: number | null;
}

function kpi(value: number, previous: number): Kpi {
  return { value, previous, change: percentChange(value, previous) };
}

export interface MonthPoint {
  /** Début du mois (ms), pour la clé et le libellé. */
  monthStart: number;
  /** Encaissé : commandes livrées (FCFA). */
  delivered: number;
  /** Commandé : toutes les commandes non annulées (FCFA). */
  ordered: number;
}

export interface DayPoint {
  dayStart: number;
  orders: number;
}

export interface StockSummary {
  total: number;
  inStock: number;
  low: number;
  out: number;
  /** Part des produits au-dessus de leur seuil d'alerte, 0 à 100 ;
   * `null` sans aucun produit. */
  rate: number | null;
}

export interface DashboardMetrics {
  revenue: Kpi;
  orders: Kpi;
  newClients: Kpi;
  activeProducts: number;
  monthly: MonthPoint[];
  daily: DayPoint[];
  stock: StockSummary;
  recentOrders: Order[];
  /** Au moins une commande, toutes périodes confondues. */
  hasOrders: boolean;
  /** Commandes reçues, prêtes ou en livraison (toutes dates) : celles que
   * la boutique doit encore faire avancer. */
  toProcess: number;
}

export function stockSummary(products: Product[]): StockSummary {
  let inStock = 0;
  let low = 0;
  let out = 0;
  for (const product of products) {
    if (product.stock <= 0) out += 1;
    else if (product.stock <= product.stockThreshold) low += 1;
    else inStock += 1;
  }
  const total = products.length;
  return { total, inStock, low, out, rate: total ? (inStock / total) * 100 : null };
}

/** Clients dont la première commande (non annulée) tombe dans la période. */
function firstTimeClients(orders: Order[], from: Date, to: Date): number {
  const first = new Map<string, number>();
  for (const order of orders) {
    if (!order.clientId || NOT_COUNTED.has(order.status)) continue;
    const ms = orderMs(order);
    const known = first.get(order.clientId);
    if (known === undefined || ms < known) first.set(order.clientId, ms);
  }
  let count = 0;
  for (const ms of first.values()) if (ms >= from.getTime() && ms < to.getTime()) count += 1;
  return count;
}

export function computeDashboardMetrics(
  orders: Order[],
  products: Product[],
  now: Date = new Date(),
  { months = 12, days = 7, recent = 6 } = {}
): DashboardMetrics {
  const monthStart = startOfShopMonth(now);
  const nextMonth = shiftMonth(monthStart, 1);
  const previousMonth = shiftMonth(monthStart, -1);
  const thisMonth = orders.filter((o) => inRange(o, monthStart, nextMonth));
  const lastMonth = orders.filter((o) => inRange(o, previousMonth, monthStart));

  const monthly: MonthPoint[] = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const from = shiftMonth(monthStart, -i);
    const to = shiftMonth(from, 1);
    const slice = orders.filter((o) => inRange(o, from, to) && !NOT_COUNTED.has(o.status));
    monthly.push({
      monthStart: from.getTime(),
      delivered: revenueOf(slice),
      ordered: slice.reduce((sum, o) => sum + o.total, 0),
    });
  }

  const today = startOfShopDay(now).getTime();
  const daily: DayPoint[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const base = new Date(today);
    const from = new Date(base.getFullYear(), base.getMonth(), base.getDate() - i);
    const to = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1);
    daily.push({ dayStart: from.getTime(), orders: countOf(orders.filter((o) => inRange(o, from, to))) });
  }

  return {
    revenue: kpi(revenueOf(thisMonth), revenueOf(lastMonth)),
    orders: kpi(countOf(thisMonth), countOf(lastMonth)),
    newClients: kpi(
      firstTimeClients(orders, monthStart, nextMonth),
      firstTimeClients(orders, previousMonth, monthStart)
    ),
    activeProducts: products.length,
    monthly,
    daily,
    stock: stockSummary(products),
    recentOrders: [...orders].sort((a, b) => orderMs(b) - orderMs(a)).slice(0, recent),
    hasOrders: orders.length > 0,
    toProcess: orders.filter((o) => TO_PROCESS.has(o.status)).length,
  };
}

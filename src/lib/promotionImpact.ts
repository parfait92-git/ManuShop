import type { Order } from "@/models/order/Order";
import type { OrderStatus } from "@/models/order/OrderStatus";

/**
 * Bilan des promotions (BF-34, 2026-10-12), tiré des commandes de la
 * boutique : ce que chaque campagne et chaque code a fait vendre, et ce
 * qu'il a coûté en réductions. Une commande annulée, retournée ou
 * défectueuse ne compte pas ; une commande en cours, si.
 */
export interface PromotionImpact {
  orders: number;
  units: number;
  /** Montant encaissé (FCFA) : articles de la campagne, ou commande avec le code. */
  revenue: number;
  /** Réductions accordées (FCFA). */
  discount: number;
}

const NOT_SOLD: OrderStatus[] = ["cancelled", "returned", "defective"];

const empty = (): PromotionImpact => ({ orders: 0, units: 0, revenue: 0, discount: 0 });

function counted(orders: Order[]): Order[] {
  return orders.filter((o) => !NOT_SOLD.includes(o.status));
}

/** Par campagne : lignes de commande où elle a fixé le prix. */
export function campaignImpacts(orders: Order[]): Map<string, PromotionImpact> {
  const impacts = new Map<string, PromotionImpact>();
  for (const order of counted(orders)) {
    const seen = new Set<string>();
    for (const item of order.items ?? []) {
      if (!item.promotionId) continue;
      const impact = impacts.get(item.promotionId) ?? empty();
      if (!seen.has(item.promotionId)) impact.orders += 1;
      seen.add(item.promotionId);
      impact.units += item.quantity;
      impact.revenue += item.unitPrice * item.quantity;
      if (typeof item.priceBeforeCampaign === "number") {
        impact.discount += Math.max(0, item.priceBeforeCampaign - item.unitPrice) * item.quantity;
      }
      impacts.set(item.promotionId, impact);
    }
  }
  return impacts;
}

/** Par code promo : commandes passées avec lui. */
export function codeImpacts(orders: Order[]): Map<string, PromotionImpact> {
  const impacts = new Map<string, PromotionImpact>();
  for (const order of counted(orders)) {
    if (!order.promoCodeId) continue;
    const impact = impacts.get(order.promoCodeId) ?? empty();
    impact.orders += 1;
    impact.units += (order.items ?? []).reduce((sum, item) => sum + item.quantity, 0);
    impact.revenue += order.total;
    impact.discount += order.discount ?? 0;
    impacts.set(order.promoCodeId, impact);
  }
  return impacts;
}

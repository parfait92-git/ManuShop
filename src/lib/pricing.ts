/**
 * Prix de vente d'un article (2026-10-12) : règle unique, partagée par la
 * vitrine et le serveur (`createOrderAction`), sur des formes minimales qui
 * ne dépendent pas du SDK Firebase de l'un ou l'autre.
 *
 * Le client paie le prix le plus bas entre :
 * - la promotion propre au produit (prix promo et dates, `lib/promo.ts`),
 *   qui ne vaut pas pour une version ayant son propre prix ;
 * - la meilleure campagne en cours qui le concerne, appliquée au prix
 *   normal.
 * Jamais les deux à la fois : pas de cumul.
 */
import { effectivePrice, type PromoFields } from "@/lib/promo";
import { listVariants } from "@/lib/variants";
import type { ProductVariant } from "@/models/product/ProductVariant";
import type { PromotionKind, PromotionTarget } from "@/models/promotion/Promotion";

interface TimeLike {
  toMillis(): number;
}

export interface CampaignFields {
  id: string;
  title: string;
  kind: PromotionKind;
  value: number;
  target: PromotionTarget;
  startsAt: TimeLike;
  endsAt: TimeLike;
  flash?: boolean;
}

export interface PricedProduct extends PromoFields {
  id: string;
  category: string;
  variants?: Record<string, ProductVariant>;
}

export interface PriceQuote {
  /** Prix payé. */
  price: number;
  /** Prix normal, barré quand `price` est plus bas. */
  regular: number;
  /** Campagne appliquée, si c'est elle qui donne le meilleur prix. */
  campaign?: CampaignFields;
}

export function isCampaignLive(campaign: CampaignFields, now: Date = new Date()): boolean {
  const t = now.getTime();
  return campaign.startsAt.toMillis() <= t && t < campaign.endsAt.toMillis();
}

export function campaignAppliesTo(campaign: CampaignFields, product: Pick<PricedProduct, "id" | "category">): boolean {
  switch (campaign.target.type) {
    case "shop":
      return true;
    case "categories":
      return campaign.target.categories.includes(product.category);
    case "products":
      return campaign.target.productIds.includes(product.id);
  }
}

/** Prix après réduction, arrondi au franc, jamais négatif. */
export function applyDiscount(price: number, kind: PromotionKind, value: number): number {
  const reduced = kind === "percent" ? price * (1 - value / 100) : price - value;
  return Math.max(0, Math.round(reduced));
}

/** Prix d'un produit (ou d'une de ses versions) à l'instant `now`. */
export function quote(
  product: PricedProduct,
  variant: ProductVariant | undefined,
  campaigns: CampaignFields[],
  now: Date = new Date()
): PriceQuote {
  const ownPrice = variant && typeof variant.price === "number";
  const regular = ownPrice ? variant.price! : product.price;
  // La promotion du produit ne vaut pas pour une version à prix propre.
  let price = ownPrice ? regular : effectivePrice(product, now);
  let campaign: CampaignFields | undefined;
  for (const c of campaigns) {
    if (!isCampaignLive(c, now) || !campaignAppliesTo(c, product)) continue;
    const reduced = applyDiscount(regular, c.kind, c.value);
    if (reduced < price) {
      price = reduced;
      campaign = c;
    }
  }
  return { price, regular, ...(campaign ? { campaign } : {}) };
}

/** Prix « à partir de » d'un produit : sa version disponible la moins
 * chère (ou toutes si aucune n'est en stock), sinon le produit. */
export function lowestQuote(product: PricedProduct, campaigns: CampaignFields[], now: Date = new Date()): PriceQuote {
  const variants = listVariants(product);
  if (variants.length === 0) return quote(product, undefined, campaigns, now);
  const pool = variants.some((v) => v.stock > 0) ? variants.filter((v) => v.stock > 0) : variants;
  return pool
    .map((v) => quote(product, v, campaigns, now))
    .reduce((best, q) => (q.price < best.price ? q : best));
}

/** Réduction affichée, en % entier (0 sans réduction). */
export function discountPercent(q: PriceQuote): number {
  return q.price < q.regular && q.regular > 0 ? Math.round((1 - q.price / q.regular) * 100) : 0;
}

/** Les campagnes en cours ou à venir, triées par fin. */
export function upcomingOrLive(campaigns: CampaignFields[], now: Date = new Date()): CampaignFields[] {
  return campaigns.filter((c) => c.endsAt.toMillis() > now.getTime()).sort((a, b) => a.endsAt.toMillis() - b.endsAt.toMillis());
}

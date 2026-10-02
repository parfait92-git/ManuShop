/**
 * Règle unique de promotion, partagée par la vitrine (SDK client) et le
 * serveur (`createOrderAction`, SDK Admin) — d'où une forme minimale de
 * produit, sans dépendre du type `Timestamp` de l'un ou l'autre SDK (les
 * deux exposent `toDate()`).
 */
export interface PromoFields {
  price: number;
  isPromo?: boolean;
  promoPrice?: number;
  promoEnd?: { toDate(): Date } | null;
}

/** Le Cameroun est en UTC+1 toute l'année (pas d'heure d'été). Fixé ici
 * plutôt que lu sur la machine : serveur (UTC) et navigateurs doivent
 * trancher pareil au même instant. */
const SHOP_UTC_OFFSET_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Instant où la promotion se termine : à la fin de son jour de fin, heure
 * du Cameroun (minuit le lendemain). `ProductForm` enregistre la date
 * choisie ("2026-10-15") comme minuit UTC de ce jour-là (`new Date(...)`
 * d'une date seule) — ce sont donc ses composantes UTC qui donnent le jour.
 */
export function promoEndsAt(promoEnd: { toDate(): Date }): Date {
  const day = promoEnd.toDate();
  const nextDayMidnightUtc = Date.UTC(
    day.getUTCFullYear(),
    day.getUTCMonth(),
    day.getUTCDate()
  ) + DAY_MS;
  return new Date(nextDayMidnightUtc - SHOP_UTC_OFFSET_MS);
}

/** Promotion réellement en cours : cochée, avec un prix promo valable, et
 * pas encore arrivée au bout de sa date de fin (si elle en a une). */
export function isPromoActive(product: PromoFields, now: Date = new Date()): boolean {
  if (!product.isPromo) return false;
  if (typeof product.promoPrice !== "number" || product.promoPrice <= 0) return false;
  if (product.promoEnd && now >= promoEndsAt(product.promoEnd)) return false;
  return true;
}

/** Prix à afficher et à facturer : le prix promo pendant la promotion,
 * sinon le prix normal — y compris une fois la date de fin passée, sans
 * que le commerçant ait à décocher quoi que ce soit. */
export function effectivePrice(product: PromoFields, now: Date = new Date()): number {
  return isPromoActive(product, now) ? product.promoPrice! : product.price;
}

/** Promotion cochée mais terminée (date de fin passée) — pour le signaler
 * au commerçant dans son formulaire. */
export function isPromoExpired(product: PromoFields, now: Date = new Date()): boolean {
  return (
    !!product.isPromo &&
    !!product.promoEnd &&
    now >= promoEndsAt(product.promoEnd)
  );
}

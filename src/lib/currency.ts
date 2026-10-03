/**
 * Devises des boutiques (choix de l'utilisateur, 2026-10-02) :
 *
 * - les prix sont **saisis et enregistrés en FCFA** (XAF), devise de
 *   référence — produits, commandes, gains : rien n'est jamais stocké dans
 *   une autre devise ;
 * - les **clients** voient prix, panier et totaux **convertis** dans la
 *   devise choisie par la boutique (`Shop.currency`) ;
 * - taux : parité officielle fixe pour l'euro, taux du dollar saisi par le
 *   Super Admin (`PlatformConfiguration.usdToXafRate`) — et, tant qu'il n'en
 *   a saisi aucun, un taux indicatif par défaut (2026-10-03 : sans lui, une
 *   boutique en dollars s'affichait en FCFA). Aucun service de change
 *   externe.
 */

export const CURRENCIES = ["XAF", "EUR", "USD"] as const;
export type CurrencyCode = (typeof CURRENCIES)[number];

/** Devise de référence : celle de tous les montants enregistrés. */
export const BASE_CURRENCY: CurrencyCode = "XAF";

/** Parité fixe officielle du franc CFA (BEAC) : 1 € = 655,957 FCFA. */
export const EUR_TO_XAF = 655.957;

/** Combien de FCFA vaut une unité de chaque devise. */
export type CurrencyRates = Record<CurrencyCode, number | undefined>;

/** Taux indicatif du dollar (1 $ = 600 FCFA), appliqué tant que le Super
 * Admin n'a pas enregistré le sien dans Réglages. */
export const DEFAULT_USD_TO_XAF = 600;

export function buildRates(usdToXafRate: number | undefined): CurrencyRates {
  return {
    XAF: 1,
    EUR: EUR_TO_XAF,
    USD: usdToXafRate && usdToXafRate > 0 ? usdToXafRate : DEFAULT_USD_TO_XAF,
  };
}

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === "string" && (CURRENCIES as readonly string[]).includes(value);
}

/** Devise d'affichage d'une boutique — FCFA si absente ou inconnue. */
export function shopCurrency(shop: { currency?: string } | null | undefined): CurrencyCode {
  return isCurrencyCode(shop?.currency) ? shop.currency : BASE_CURRENCY;
}

/**
 * Devise réellement utilisable pour afficher : sans taux connu (taux du
 * dollar pas encore saisi par le Super Admin), on reste en FCFA plutôt que
 * d'afficher un montant faux.
 */
export function displayCurrency(currency: CurrencyCode, rates: CurrencyRates): CurrencyCode {
  return rates[currency] ? currency : BASE_CURRENCY;
}

/** Montant en FCFA → montant dans `currency`, non arrondi. */
export function convertFromXaf(
  amountXaf: number,
  currency: CurrencyCode,
  rates: CurrencyRates
): number {
  const rate = rates[displayCurrency(currency, rates)]!;
  return amountXaf / rate;
}

/** Le FCFA n'a pas de centimes ; l'euro et le dollar en ont. */
function fractionDigits(currency: CurrencyCode): number {
  return currency === "XAF" ? 0 : 2;
}

/**
 * Montant enregistré en FCFA, affiché dans la devise de la boutique :
 * `formatMoney(10000, "EUR", rates, "fr-FR")` → "15,24 €". Un total se
 * convertit en une fois (pas la somme de prix déjà arrondis), pour ne pas
 * cumuler les écarts d'arrondi.
 */
export function formatMoney(
  amountXaf: number,
  currency: CurrencyCode,
  rates: CurrencyRates,
  locale: string
): string {
  const target = displayCurrency(currency, rates);
  const digits = fractionDigits(target);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: target,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(convertFromXaf(amountXaf, target, rates));
}

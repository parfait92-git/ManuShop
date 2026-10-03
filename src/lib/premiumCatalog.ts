/**
 * Offres premium (2026-10-03) — fonctions pures, partagées par le
 * navigateur et le serveur.
 *
 * Choix de l'utilisateur :
 * - le Super Admin décide de ce qui est premium et de son prix ;
 * - les thèmes se vendent à l'unité ; « ManuShop Nuit » et « Wax Soleil »
 *   sont gratuits, les suivants premium par défaut ;
 * - chaque formule d'abonnement inclut les articles premium cochés par le
 *   Super Admin, et son prix est réglable ;
 * - un article acheté l'est définitivement (ajouté aux privilèges de la
 *   boutique, `Shop.premiumFeatures`), après validation du paiement par le
 *   Super Admin (pas encore de paiement en ligne).
 *
 * Réglages enregistrés dans `configuration/premium` ; ce module les
 * complète par des valeurs par défaut (nouvel article, nouveau thème).
 */

import { PREMIUM_FEATURES, PREMIUM_FEATURE_KEYS } from "@/lib/premiumFeatures";
import { SUBSCRIPTION_PLANS } from "@/lib/subscriptionPlans";
import type { SubscriptionPlan } from "@/models/shop/Shop";
import { THEMES } from "@/themes/registry";

/** Thèmes gratuits par défaut (choix de l'utilisateur). */
const FREE_THEME_IDS = ["default", "wax-soleil"];

export type PremiumItemKind = "feature" | "theme";

export interface PremiumItem {
  /** Clé de privilège : celle d'une fonctionnalité, ou `theme:<id>`. */
  key: string;
  kind: PremiumItemKind;
  label: string;
}

export const themeItemKey = (themeId: string) => `theme:${themeId}`;

/** Tout ce qui peut être premium : les fonctionnalités, puis les thèmes. */
export function listPremiumItems(): PremiumItem[] {
  return [
    ...PREMIUM_FEATURE_KEYS.map((key) => ({
      key,
      kind: "feature" as const,
      label: PREMIUM_FEATURES[key],
    })),
    ...THEMES.map((theme) => ({
      key: themeItemKey(theme.id),
      kind: "theme" as const,
      label: `Thème « ${theme.name} »`,
    })),
  ];
}

export function isPremiumItemKey(key: unknown): key is string {
  return typeof key === "string" && listPremiumItems().some((item) => item.key === key);
}

export interface PremiumItemSettings {
  premium: boolean;
  /** Prix d'achat à l'unité, en FCFA ; `null` : pas encore fixé (achat
   * impossible). */
  priceFcfa: number | null;
}

export interface PlanSettings {
  priceFcfa: number;
  /** Clés des articles premium inclus dans la formule. */
  includes: string[];
}

export interface PremiumCatalog {
  items: Record<string, PremiumItemSettings>;
  plans: Record<SubscriptionPlan, PlanSettings>;
}

function defaultItem(item: PremiumItem): PremiumItemSettings {
  const free = item.kind === "theme" && FREE_THEME_IDS.includes(item.key.slice("theme:".length));
  return { premium: !free, priceFcfa: null };
}

const isPrice = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 10_000_000;

/** Réglages enregistrés, complétés par les valeurs par défaut — tout
 * article ou formule absent, ou mal formé, prend sa valeur par défaut. */
export function resolvePremiumCatalog(stored: unknown): PremiumCatalog {
  const raw = (stored ?? {}) as {
    items?: Record<string, Partial<PremiumItemSettings>>;
    plans?: Record<string, Partial<PlanSettings>>;
  };
  const items: Record<string, PremiumItemSettings> = {};
  const keys = new Set(listPremiumItems().map((i) => i.key));
  for (const item of listPremiumItems()) {
    const saved = raw.items?.[item.key];
    const fallback = defaultItem(item);
    items[item.key] = {
      premium: typeof saved?.premium === "boolean" ? saved.premium : fallback.premium,
      priceFcfa: isPrice(saved?.priceFcfa) ? saved.priceFcfa : fallback.priceFcfa,
    };
  }
  const plans = {} as Record<SubscriptionPlan, PlanSettings>;
  for (const plan of SUBSCRIPTION_PLANS) {
    const saved = raw.plans?.[plan.id];
    plans[plan.id] = {
      priceFcfa: isPrice(saved?.priceFcfa) ? saved.priceFcfa : plan.priceFcfa,
      includes: Array.isArray(saved?.includes)
        ? [...new Set(saved.includes.filter((k): k is string => typeof k === "string" && keys.has(k)))]
        : [],
    };
  }
  return { items, plans };
}

/** Erreurs de saisie du Super Admin (même contrôle côté serveur). */
export function validatePremiumCatalog(catalog: PremiumCatalog): string | null {
  for (const [key, item] of Object.entries(catalog.items)) {
    if (!isPremiumItemKey(key)) return `Article inconnu : ${key}.`;
    if (item.priceFcfa !== null && !isPrice(item.priceFcfa)) {
      return "Un prix doit être un nombre entier de FCFA, entre 0 et 10 000 000.";
    }
  }
  for (const plan of SUBSCRIPTION_PLANS) {
    const settings = catalog.plans[plan.id];
    if (!settings || !isPrice(settings.priceFcfa)) {
      return `Le prix de la formule « ${plan.label} » doit être un nombre entier de FCFA.`;
    }
    if (settings.includes.some((key) => !isPremiumItemKey(key))) {
      return `La formule « ${plan.label} » inclut un article inconnu.`;
    }
  }
  return null;
}

/** Ce que l'accès premium d'une boutique doit connaître d'elle. */
export interface ShopPremiumState {
  premiumFeatures?: string[];
  subscriptionPlan?: SubscriptionPlan;
  /** Fin de l'abonnement, en millisecondes. */
  subscriptionExpiresAtMs?: number;
}

/** D'où vient l'accès à un article, ou `null` s'il n'y en a pas. */
export type PremiumAccess = "free" | "owned" | "plan" | null;

/**
 * Accès d'une boutique à un article : gratuit, possédé (acheté ou accordé
 * par le Super Admin), ou inclus dans son abonnement en cours.
 */
export function premiumAccess(
  key: string,
  shop: ShopPremiumState,
  catalog: PremiumCatalog,
  now: Date = new Date()
): PremiumAccess {
  const settings = catalog.items[key];
  if (!settings || !settings.premium) return "free";
  if (shop.premiumFeatures?.includes(key)) return "owned";
  const plan = shop.subscriptionPlan;
  const active = typeof shop.subscriptionExpiresAtMs === "number" && shop.subscriptionExpiresAtMs > now.getTime();
  if (plan && active && catalog.plans[plan]?.includes.includes(key)) return "plan";
  return null;
}

export function hasPremiumAccess(
  key: string,
  shop: ShopPremiumState,
  catalog: PremiumCatalog,
  now?: Date
): boolean {
  return premiumAccess(key, shop, catalog, now) !== null;
}

/** `Shop` (navigateur ou serveur) → état premium. */
export function toShopPremiumState(shop: {
  premiumFeatures?: unknown;
  subscriptionPlan?: unknown;
  subscriptionExpiresAt?: unknown;
}): ShopPremiumState {
  const expires = shop.subscriptionExpiresAt as { toMillis?: () => number } | undefined;
  return {
    premiumFeatures: Array.isArray(shop.premiumFeatures)
      ? shop.premiumFeatures.filter((k): k is string => typeof k === "string")
      : [],
    subscriptionPlan: shop.subscriptionPlan as SubscriptionPlan | undefined,
    subscriptionExpiresAtMs: expires?.toMillis?.(),
  };
}

export function formatFcfa(amount: number): string {
  return `${amount.toLocaleString("fr-FR").replace(/[  ]/g, " ")} FCFA`;
}

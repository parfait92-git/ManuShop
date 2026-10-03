/**
 * Promotion affichée sur la page d'accueil (`LaunchPromo`), réglée par le
 * Super Admin dans Réglages (demande de l'utilisateur, 2026-10-02) —
 * `PlatformConfiguration.launchPromo`. Fonctions pures, partagées par le
 * formulaire (navigateur), l'action serveur et la page d'accueil.
 */

export interface LaunchPromoSettings {
  /** Interrupteur : masquée si `false`, même avant sa date de fin. */
  enabled: boolean;
  /** Petit titre au-dessus du titre, facultatif. */
  eyebrow: string;
  title: string;
  description: string;
  /** Fin de l'offre, date ISO 8601 ("2026-10-30T23:59:59+01:00"). */
  endsAt: string;
}

/** Valeurs en place avant le réglage par le Super Admin : tant qu'il n'a
 * rien enregistré, l'accueil reste exactement comme avant. */
export const DEFAULT_LAUNCH_PROMO: LaunchPromoSettings = {
  enabled: true,
  eyebrow: "Promotion de lancement",
  title: "Votre première vitrine digitale commence ici.",
  description:
    "Profitez de l'offre spéciale réservée aux commerçants et démarrez avec tous les outils essentiels.",
  endsAt: "2026-10-30T23:59:59+01:00",
};

export const LAUNCH_PROMO_LIMITS = {
  eyebrow: 40,
  titleMin: 3,
  title: 80,
  descriptionMin: 10,
  description: 220,
} as const;

/** Réglage enregistré, complété par les valeurs par défaut pour tout champ
 * absent ou d'un mauvais type (document modifié à la main, version
 * antérieure...). */
export function resolveLaunchPromo(stored: unknown): LaunchPromoSettings {
  const value = (stored ?? {}) as Partial<Record<keyof LaunchPromoSettings, unknown>>;
  const text = (key: "eyebrow" | "title" | "description" | "endsAt") =>
    typeof value[key] === "string" ? (value[key] as string) : DEFAULT_LAUNCH_PROMO[key];
  return {
    enabled: typeof value.enabled === "boolean" ? value.enabled : DEFAULT_LAUNCH_PROMO.enabled,
    eyebrow: text("eyebrow"),
    title: text("title"),
    description: text("description"),
    endsAt: text("endsAt"),
  };
}

/** Affichée seulement si activée et pas encore terminée. */
export function isLaunchPromoVisible(promo: LaunchPromoSettings, now: Date = new Date()): boolean {
  const end = Date.parse(promo.endsAt);
  return promo.enabled && Number.isFinite(end) && end > now.getTime();
}

export type LaunchPromoErrors = Partial<Record<keyof LaunchPromoSettings, string>>;

/** Mêmes règles dans le formulaire et dans l'action serveur. Une offre
 * peut être enregistrée avec une date passée (pour la garder en réserve),
 * mais seulement si elle est désactivée. */
export function validateLaunchPromo(
  promo: LaunchPromoSettings,
  now: Date = new Date()
): LaunchPromoErrors {
  const errors: LaunchPromoErrors = {};
  const L = LAUNCH_PROMO_LIMITS;
  if (promo.eyebrow.trim().length > L.eyebrow) {
    errors.eyebrow = `${L.eyebrow} caractères au maximum.`;
  }
  const title = promo.title.trim().length;
  if (title < L.titleMin || title > L.title) {
    errors.title = `Entre ${L.titleMin} et ${L.title} caractères.`;
  }
  const description = promo.description.trim().length;
  if (description < L.descriptionMin || description > L.description) {
    errors.description = `Entre ${L.descriptionMin} et ${L.description} caractères.`;
  }
  const end = Date.parse(promo.endsAt);
  if (!Number.isFinite(end)) {
    errors.endsAt = "Indiquez une date et une heure de fin.";
  } else if (promo.enabled && end <= now.getTime()) {
    errors.endsAt = "La date de fin est déjà passée : choisissez une date future, ou désactivez l'offre.";
  }
  return errors;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Date ISO → valeur d'un champ `datetime-local` ("2026-10-30T23:59"),
 * dans le fuseau horaire de l'appareil du Super Admin (2026-10-03). */
export function toShopDateTimeInput(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "";
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Champ `datetime-local` (heure de l'appareil) → date ISO, un instant
 * précis : l'offre finit au même moment pour tous les visiteurs. La minute
 * saisie est incluse jusqu'à sa dernière seconde. */
export function fromShopDateTimeInput(value: string): string {
  if (!value) return "";
  const ms = new Date(`${value}:59`).getTime();
  return Number.isFinite(ms) ? new Date(ms).toISOString() : "";
}

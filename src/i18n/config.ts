/**
 * Langues de l'application — structure posée le 2026-10-02 en préparation
 * de l'étape « gestion de la langue » (choix de l'utilisateur : fichiers et
 * mécanisme en place dès maintenant, utilisés pour les montants et les
 * dates ; traduction de tous les écrans à l'étape langue).
 *
 * Convention du guide Next.js de cette version
 * (node_modules/next/dist/docs/01-app/02-guides/internationalization.md) :
 * un dictionnaire JSON par langue. Le routage par langue (`app/[lang]`,
 * détection via `Accept-Language` dans `proxy.ts`) viendra avec l'étape
 * langue ; d'ici là, la langue est toujours `DEFAULT_LOCALE`.
 */
export const LOCALES = ["fr", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "fr";

/** Format des nombres, montants et dates de chaque langue. */
export const INTL_LOCALE: Record<Locale, string> = {
  fr: "fr-FR",
  en: "en-US",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

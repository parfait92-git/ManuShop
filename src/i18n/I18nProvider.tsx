"use client";

import { createContext, useCallback, useContext, useMemo } from "react";

import { DEFAULT_LOCALE, INTL_LOCALE, type Locale } from "@/i18n/config";
import en from "@/i18n/dictionaries/en.json";
import fr from "@/i18n/dictionaries/fr.json";

/** Le dictionnaire français fait référence : ses clés typent `t()`, et un
 * test vérifie que chaque autre langue a exactement les mêmes clés. */
export type Dictionary = typeof fr;

const DICTIONARIES: Record<Locale, Dictionary> = { fr, en };

/** "currency.clientPreview" pour `{ currency: { clientPreview: "…" } }`. */
type Leaves<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : Leaves<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type MessageKey = Leaves<Dictionary>;

export function translate(
  dictionary: Dictionary,
  key: MessageKey,
  params: Record<string, string | number> = {}
): string {
  const message = key
    .split(".")
    .reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], dictionary);
  if (typeof message !== "string") return key;
  return message.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match
  );
}

interface I18nContextValue {
  locale: Locale;
  /** Locale `Intl` des nombres, montants et dates ("fr-FR"). */
  intlLocale: string;
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

/**
 * Langue de l'interface. Toujours `DEFAULT_LOCALE` pour l'instant : la
 * prop `locale` sera alimentée par le segment `[lang]` à l'étape langue.
 */
export function I18nProvider({
  locale = DEFAULT_LOCALE,
  children,
}: {
  locale?: Locale;
  children: React.ReactNode;
}) {
  const t = useCallback(
    (key: MessageKey, params?: Record<string, string | number>) =>
      translate(DICTIONARIES[locale], key, params),
    [locale]
  );
  const value = useMemo(
    () => ({ locale, intlLocale: INTL_LOCALE[locale], t }),
    [locale, t]
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Hors `I18nProvider` (tests de composants isolés) : langue par défaut. */
const FALLBACK: I18nContextValue = {
  locale: DEFAULT_LOCALE,
  intlLocale: INTL_LOCALE[DEFAULT_LOCALE],
  t: (key, params) => translate(DICTIONARIES[DEFAULT_LOCALE], key, params),
};

export function useI18n(): I18nContextValue {
  return useContext(I18nContext) ?? FALLBACK;
}

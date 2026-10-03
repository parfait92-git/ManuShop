"use client";

import { useCallback } from "react";

import { useCurrencyRates } from "@/components/providers/CurrencyContext";
import { useI18n } from "@/i18n/I18nProvider";
import { formatMoney, type CurrencyCode } from "@/lib/currency";

/**
 * Formate un montant enregistré en FCFA dans la devise d'une boutique et la
 * langue de l'interface : `const money = useMoney("EUR"); money(10000)` →
 * "15,24 €".
 */
export function useMoney(currency: CurrencyCode): (amountXaf: number) => string {
  const rates = useCurrencyRates();
  const { intlLocale } = useI18n();
  return useCallback(
    (amountXaf: number) => formatMoney(amountXaf, currency, rates, intlLocale),
    [currency, rates, intlLocale]
  );
}

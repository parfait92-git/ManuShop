"use client";

import { useCallback } from "react";

import { useCurrencyRates } from "@/components/providers/CurrencyContext";
import { useMoney } from "@/hooks/useMoney";
import { useI18n } from "@/i18n/I18nProvider";
import { convertFromXaf, displayCurrency, type CurrencyCode } from "@/lib/currency";

/** Montants des graphiques, dans la devise de la boutique : `full` pour
 * les infobulles (« 125 000 FCFA »), `compact` pour les axes (« 125 k »). */
export function useChartMoney(currency: CurrencyCode) {
  const full = useMoney(currency);
  const rates = useCurrencyRates();
  const { intlLocale } = useI18n();
  const compact = useCallback(
    (amountXaf: number) =>
      new Intl.NumberFormat(intlLocale, { notation: "compact", maximumFractionDigits: 1 }).format(
        convertFromXaf(amountXaf, displayCurrency(currency, rates), rates)
      ),
    [currency, rates, intlLocale]
  );
  return { full, compact };
}

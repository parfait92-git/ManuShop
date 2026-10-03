"use client";

import { useEffect, useState } from "react";

import { CurrencyContext } from "@/components/providers/CurrencyContext";
import { buildRates, type CurrencyRates } from "@/lib/currency";
import { configurationService } from "@/services/ConfigurationService";

/**
 * Taux de change de la plateforme, chargés une fois pour toute
 * l'application (`configuration/general`, lisible par tous). Euro
 * disponible tout de suite (parité fixe) ; dollar dès que son taux est lu —
 * en attendant, ou s'il n'est pas fixé, les prix restent en FCFA plutôt que
 * faux (voir `displayCurrency`).
 */
export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [rates, setRates] = useState<CurrencyRates>(() => buildRates(undefined));

  useEffect(() => {
    let active = true;
    configurationService
      .getUsdToXafRate()
      .then((usd) => {
        if (active && usd) setRates(buildRates(usd));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return <CurrencyContext.Provider value={rates}>{children}</CurrencyContext.Provider>;
}

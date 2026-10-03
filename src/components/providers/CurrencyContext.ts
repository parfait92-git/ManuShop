"use client";

import { createContext, useContext } from "react";

import { buildRates, type CurrencyRates } from "@/lib/currency";

/**
 * Taux de change courants — module volontairement sans dépendance
 * (Firestore, services) : tout composant qui affiche un montant le lit via
 * `useMoney`, il ne doit pas embarquer le chargement des taux, fait une
 * seule fois par `CurrencyProvider`. Valeur par défaut : euro seul (parité
 * fixe), dollar inconnu.
 */
export const CurrencyContext = createContext<CurrencyRates>(buildRates(undefined));

export function useCurrencyRates(): CurrencyRates {
  return useContext(CurrencyContext);
}

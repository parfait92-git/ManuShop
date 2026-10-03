"use client";

import { useEffect, useState } from "react";

import { BASE_CURRENCY, shopCurrency, type CurrencyCode } from "@/lib/currency";

/** Une seule lecture par boutique pour toute la session : une grille de
 * produits d'une même boutique ne relit pas la boutique pour chaque carte. */
const cache = new Map<string, Promise<CurrencyCode>>();

export function resolveShopCurrency(shopId: string): Promise<CurrencyCode> {
  let pending = cache.get(shopId);
  if (!pending) {
    // Service chargé à la demande : toute carte produit affiche un prix,
    // elle n'a pas à embarquer l'accès Firestore à son chargement. Échec
    // (hors ligne...) : FCFA, la devise de référence, plutôt qu'une erreur.
    pending = import("@/services/ShopService")
      .then(({ shopService }) => shopService.getShop(shopId))
      .then((shop) => shopCurrency(shop))
      .catch(() => BASE_CURRENCY);
    cache.set(shopId, pending);
  }
  return pending;
}

/** Réservé aux tests. */
export function clearShopCurrencyCache(): void {
  cache.clear();
}

/** Devise d'affichage d'une boutique (FCFA tant qu'elle n'est pas lue). */
export function useShopCurrency(shopId: string | undefined): CurrencyCode {
  const [currency, setCurrency] = useState<CurrencyCode>(BASE_CURRENCY);

  useEffect(() => {
    if (!shopId) return;
    let active = true;
    resolveShopCurrency(shopId).then((value) => {
      if (active) setCurrency(value);
    });
    return () => {
      active = false;
    };
  }, [shopId]);

  return currency;
}

"use client";

import { useEffect, useState } from "react";

import { hasPremiumAccess, toShopPremiumState, type PremiumCatalog } from "@/lib/premiumCatalog";
import { premiumService } from "@/services/PremiumService";

/** Offres premium en vigueur ; `null` tant qu'elles ne sont pas lues. */
export function usePremiumCatalog(): PremiumCatalog | null {
  const [catalog, setCatalog] = useState<PremiumCatalog | null>(null);
  useEffect(() => {
    let active = true;
    premiumService.getCatalog().then((value) => active && setCatalog(value));
    return () => {
      active = false;
    };
  }, []);
  return catalog;
}

/**
 * Accès premium d'une boutique déjà chargée : `(clé) => boolean`. Tant que
 * les offres ne sont pas lues, seuls les privilèges possédés comptent.
 */
export function usePremiumAccess(
  shop: { premiumFeatures?: unknown; subscriptionPlan?: unknown; subscriptionExpiresAt?: unknown } | null | undefined
): (key: string) => boolean {
  const catalog = usePremiumCatalog();
  return (key: string) => {
    if (!shop) return false;
    const state = toShopPremiumState(shop);
    return catalog ? hasPremiumAccess(key, state, catalog) : !!state.premiumFeatures?.includes(key);
  };
}

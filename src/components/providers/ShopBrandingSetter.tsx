"use client";

import { useEffect } from "react";

import { useShopBranding } from "@/components/providers/ShopBrandingProvider";

/**
 * Fait connaître la boutique affichée à la vitrine (en-tête, thème) depuis
 * une page rendue côté serveur — ex. la vérification d'une facture, qui
 * doit s'afficher aux couleurs de la boutique (2026-10-03).
 */
export function ShopBrandingSetter({ shopId, name, logo }: { shopId: string; name: string; logo?: string }) {
  const { setBranding } = useShopBranding();
  useEffect(() => {
    setBranding({ shopId, name, logo });
    return () => setBranding(null);
  }, [shopId, name, logo, setBranding]);
  return null;
}

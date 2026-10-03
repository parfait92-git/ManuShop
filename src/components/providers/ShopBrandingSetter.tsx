"use client";

import { useEffect } from "react";

import { useShopBranding } from "@/components/providers/ShopBrandingProvider";
import { shopService } from "@/services/ShopService";

/**
 * Fait connaître la boutique affichée à la vitrine (en-tête, thème). La
 * boutique reste la boutique courante en quittant la page (voir
 * `ShopBrandingProvider`). Avec seulement `shopId` (ex. le paiement, qui
 * connaît la boutique du panier), son nom et son logo sont lus.
 */
export function ShopBrandingSetter({ shopId, name, logo }: { shopId: string; name?: string; logo?: string }) {
  const { branding, setBranding } = useShopBranding();
  const known = branding?.shopId === shopId;
  const sameName = known && (!name || branding?.name === name);

  useEffect(() => {
    // Déjà la boutique courante : rien à changer (on garde aussi ses liens
    // de réseaux sociaux, posés par sa page d'accueil).
    if (sameName) return;
    if (name) {
      setBranding({ shopId, name, logo });
      return;
    }
    let active = true;
    shopService
      .getShop(shopId)
      .then((shop) => {
        if (active && shop) setBranding({ shopId, name: shop.name, logo: shop.logo || undefined });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [shopId, name, logo, sameName, setBranding]);
  return null;
}

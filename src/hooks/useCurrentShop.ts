"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/components/providers/AuthProvider";
import type { Shop } from "@/models/shop/Shop";
import { shopService } from "@/services/ShopService";

/** La boutique DE CET admin/vendeur, via son propre `profile.shopId` — pas
 * `useShop()`/`getPrimaryShop()`, qui renvoie "la première boutique de la
 * base" sans rapport avec l'utilisateur connecté (utile seulement pour la
 * vitrine publique mono-tenant `/catalogue`). */
export function useCurrentShop() {
  const { profile } = useAuth();
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.shopId) {
      queueMicrotask(() => {
        setShop(null);
        setLoading(false);
      });
      return;
    }
    let active = true;
    shopService.getShop(profile.shopId).then((data) => {
      if (!active) return;
      setShop(data);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [profile?.shopId]);

  return { shop, loading };
}

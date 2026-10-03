"use client";

import { useEffect, useState } from "react";

import type { Shop } from "@/models/shop/Shop";
import { shopService } from "@/services/ShopService";
import { cartShopId, useCartStore } from "@/store/cartStore";

/**
 * La boutique du panier — celle à qui la commande (ou le message WhatsApp)
 * est envoyée, et dont la devise s'affiche. Remplace `useShop()`, qui
 * renvoyait la première boutique de la plateforme, quelle que soit celle
 * des articles.
 */
export function useCartShop(): { shop: Shop | null; loading: boolean } {
  const shopId = useCartStore((state) => cartShopId(state.items));
  const [loaded, setLoaded] = useState<{ id: string; shop: Shop | null } | null>(null);

  useEffect(() => {
    if (!shopId) return;
    let active = true;
    shopService
      .getShop(shopId)
      .catch(() => null)
      .then((shop) => {
        if (active) setLoaded({ id: shopId, shop });
      });
    return () => {
      active = false;
    };
  }, [shopId]);

  if (!shopId) return { shop: null, loading: false };
  if (loaded?.id !== shopId) return { shop: null, loading: true };
  return { shop: loaded.shop, loading: false };
}

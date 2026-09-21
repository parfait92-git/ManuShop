"use client";

import { useEffect, useState } from "react";

import type { Shop } from "@/models/shop/Shop";
import { shopService } from "@/services/ShopService";

/** The project is single-tenant for now: resolves the one shop that exists. */
export function useShop() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    shopService.getPrimaryShop().then((data) => {
      if (!active) return;
      setShop(data);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return { shop, loading };
}

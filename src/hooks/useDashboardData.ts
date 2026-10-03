"use client";

import { useEffect, useMemo, useState } from "react";

import { computeDashboardMetrics, type DashboardMetrics } from "@/lib/dashboardMetrics";
import type { Order } from "@/models/order/Order";
import type { Product } from "@/models/product/Product";
import { orderService } from "@/services/OrderService";
import { productService } from "@/services/ProductService";

export type DashboardData =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; metrics: DashboardMetrics };

/** Commandes et produits actifs de la boutique courante, agrégés pour
 * l'accueil du tableau de bord. Données réelles uniquement. */
export function useDashboardData(shopId: string): DashboardData {
  const [raw, setRaw] = useState<{ orders: Order[]; products: Product[] } | "error" | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([orderService.listByShop(shopId), productService.listActive(shopId)])
      .then(([orders, products]) => active && setRaw({ orders, products }))
      .catch(() => active && setRaw("error"));
    return () => {
      active = false;
    };
  }, [shopId]);

  return useMemo<DashboardData>(() => {
    if (raw === null) return { status: "loading" };
    if (raw === "error") return { status: "error" };
    return { status: "ready", metrics: computeDashboardMetrics(raw.orders, raw.products) };
  }, [raw]);
}

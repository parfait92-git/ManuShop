"use client";

import {
  AlertTriangle,
  Package,
  ShoppingBag,
  Store,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { CoachMark } from "@/components/ui/CoachMark";
import { useAuth } from "@/components/providers/AuthProvider";
import { ProductList } from "@/components/dashboard/ProductList";
import { computeDashboardMetrics } from "@/lib/dashboardMetrics";
import { ORDER_STATUS_BADGE_CLASS, ORDER_STATUS_LABEL } from "@/lib/orderStatus";
import type { Category } from "@/models/category/Category";
import type { Order } from "@/models/order/Order";
import type { Product } from "@/models/product/Product";
import { categoryService } from "@/services/CategoryService";
import { orderService } from "@/services/OrderService";
import { productService } from "@/services/ProductService";

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function StatCard({
  icon: Icon,
  label,
  value,
  muted,
  hint,
}: {
  icon: typeof Package;
  label: string;
  value: string;
  muted?: boolean;
  hint?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-shell-border bg-shell-surface p-4">
      <span className="flex size-9 items-center justify-center rounded-full bg-shell-accent-soft text-shell-accent">
        <Icon className="size-4.5" />
      </span>
      <div>
        <p className="flex items-center gap-1.5 text-sm text-shell-subtle">
          {label}
          {hint ? <CoachMark label={`À propos de "${label}"`}>{hint}</CoachMark> : null}
        </p>
        <p
          className={
            muted
              ? "text-lg font-semibold text-shell-subtle"
              : "text-2xl font-semibold text-shell-text"
          }
        >
          {value}
        </p>
      </div>
    </div>
  );
}

export function DashboardHomeContent({ shopId }: { shopId: string }) {
  const { profile } = useAuth();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      productService.listActive(shopId),
      categoryService.listCategories(shopId),
      orderService.listByShop(shopId),
    ]).then(([productList, categoryList, orderList]) => {
      if (!active) return;
      setProducts(productList);
      setCategories(categoryList);
      setOrders(
        [...orderList].sort(
          (a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()
        )
      );
    });
    return () => {
      active = false;
    };
  }, [shopId]);

  // Mêmes chiffres que la vue tablette et ordinateur
  // (`dashboardMetrics.ts`) : mois à l'heure de l'appareil, commandes
  // annulées exclues, nouveaux clients = première commande ce mois-ci.
  const metrics = orders ? computeDashboardMetrics(orders, products ?? []) : null;
  const revenueThisMonth = metrics?.revenue.value ?? 0;
  const newClientsThisMonth = metrics?.newClients.value ?? 0;
  const ordersThisMonthCount = metrics?.orders.value ?? 0;
  const recentOrders = orders?.slice(0, 5) ?? [];

  const firstName = profile?.displayName.split(" ")[0] ?? "";
  const today = capitalize(
    new Date().toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  );

  const attentionCount = products
    ? products.filter((p) => productService.getStockStatus(p) !== "in-stock")
        .length
    : 0;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-shell-accent">{today}</p>
          <h1 className="text-2xl font-semibold text-shell-text sm:text-3xl">
            Bonjour{firstName ? `, ${firstName}` : ""}.
          </h1>
          <p className="mt-1 text-sm text-shell-subtle">
            Voici ce qui se passe dans votre boutique aujourd&apos;hui.
          </p>
        </div>
        <Link
          href="/catalogue"
          data-tour="view-shop"
          className={buttonVariants({
            variant: "outline",
            className: "w-fit gap-1.5",
          })}
        >
          <Store className="size-4" />
          Voir la boutique
        </Link>
      </div>

      <div
        data-tour="stat-cards"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard
          icon={ShoppingBag}
          label="Ventes du mois"
          value={
            orders ? `${revenueThisMonth.toLocaleString("fr-FR")} FCFA` : "…"
          }
          hint="Ne compte que les commandes déjà livrées ce mois-ci — pas les commandes en cours."
        />
        <StatCard
          icon={Package}
          label="Produits actifs"
          value={products ? String(products.length) : "…"}
        />
        <StatCard
          icon={Users}
          label="Nouveaux clients"
          value={orders ? String(newClientsThisMonth) : "…"}
        />
        <StatCard
          icon={ShoppingBag}
          label="Commandes du mois"
          value={orders ? String(ordersThisMonthCount) : "…"}
        />
      </div>

      {products === null ? (
        <p className="text-sm text-muted-foreground">Chargement...</p>
      ) : (
        <ProductList initialProducts={products} categories={categories} />
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-3 rounded-xl border border-shell-border bg-shell-surface p-4 sm:p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-shell-text">
                Ventes récentes
              </h2>
              <p className="text-sm text-shell-subtle">
                Les dernières commandes reçues
              </p>
            </div>
            <Link
              href="/dashboard/orders"
              className="text-sm font-medium text-shell-accent hover:underline"
            >
              Tout voir
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="rounded-lg bg-shell-bg px-4 py-6 text-center text-sm text-shell-subtle">
              Aucune commande pour le moment.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-shell-border">
              {recentOrders.map((order) => (
                <li
                  key={order.id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium text-shell-text">
                      {order.clientName}
                    </p>
                    <p className="text-xs text-shell-subtle">
                      {order.total.toLocaleString("fr-FR")} FCFA
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${ORDER_STATUS_BADGE_CLASS[order.status]}`}
                  >
                    {ORDER_STATUS_LABEL[order.status]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-3 rounded-xl bg-shell-brand p-4 text-shell-brand-text sm:p-6">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold tracking-widest text-shell-brand-icon uppercase">
              Conseil du jour
            </p>
            <AlertTriangle className="size-4 text-shell-brand-icon" />
          </div>
          {attentionCount > 0 ? (
            <>
              <h3 className="text-lg font-semibold">Mettez vos stocks à jour</h3>
              <p className="text-sm text-shell-brand-text/75">
                {attentionCount} article{attentionCount > 1 ? "s" : ""}{" "}
                nécessite
                {attentionCount > 1 ? "nt" : ""} votre attention. Un stock bien
                suivi vous aide à ne manquer aucune vente.
              </p>
              <Link
                href="/dashboard/products"
                className="mt-1 w-fit rounded-lg bg-shell-accent-fill px-3 py-2 text-sm font-medium text-shell-accent-fill-text hover:bg-shell-accent-fill-hover"
              >
                Voir les alertes
              </Link>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold">Vos stocks sont à jour</h3>
              <p className="text-sm text-shell-brand-text/75">
                Aucun article ne nécessite votre attention pour le moment.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

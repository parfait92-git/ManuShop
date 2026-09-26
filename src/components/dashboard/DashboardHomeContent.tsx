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
import { useAuth } from "@/components/providers/AuthProvider";
import { ProductList } from "@/components/dashboard/ProductList";
import { ORDER_STATUS_BADGE_CLASS, ORDER_STATUS_LABEL } from "@/lib/orderStatus";
import type { Category } from "@/models/category/Category";
import type { Order } from "@/models/order/Order";
import type { Product } from "@/models/product/Product";
import { categoryService } from "@/services/CategoryService";
import { orderService } from "@/services/OrderService";
import { productService } from "@/services/ProductService";

function isThisMonth(order: Order): boolean {
  const now = new Date();
  const date = order.createdAt.toDate();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function StatCard({
  icon: Icon,
  label,
  value,
  muted,
}: {
  icon: typeof Package;
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <span className="flex size-9 items-center justify-center rounded-full bg-cyan-50 text-cyan-600">
        <Icon className="size-4.5" />
      </span>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p
          className={
            muted
              ? "text-lg font-semibold text-slate-400"
              : "text-2xl font-semibold text-slate-950"
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

  const ordersThisMonth = orders?.filter(isThisMonth) ?? [];
  const revenueThisMonth = ordersThisMonth
    .filter((o) => o.status === "delivered")
    .reduce((sum, o) => sum + o.total, 0);
  const newClientsThisMonth = new Set(
    ordersThisMonth.map((o) => o.clientId).filter(Boolean)
  ).size;
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
          <p className="text-sm text-cyan-600">{today}</p>
          <h1 className="text-2xl font-semibold text-slate-950 sm:text-3xl">
            Bonjour{firstName ? `, ${firstName}` : ""}.
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Voici ce qui se passe dans votre boutique aujourd&apos;hui.
          </p>
        </div>
        <Link
          href="/catalogue"
          className={buttonVariants({
            variant: "outline",
            className: "w-fit gap-1.5",
          })}
        >
          <Store className="size-4" />
          Voir la boutique
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={ShoppingBag}
          label="Ventes du mois"
          value={
            orders ? `${revenueThisMonth.toLocaleString("fr-FR")} FCFA` : "…"
          }
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
          value={orders ? String(ordersThisMonth.length) : "…"}
        />
      </div>

      {products === null ? (
        <p className="text-sm text-muted-foreground">Chargement...</p>
      ) : (
        <ProductList initialProducts={products} categories={categories} />
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Ventes récentes
              </h2>
              <p className="text-sm text-slate-500">
                Les dernières commandes reçues
              </p>
            </div>
            <Link
              href="/dashboard/orders"
              className="text-sm font-medium text-cyan-600 hover:underline"
            >
              Tout voir
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              Aucune commande pour le moment.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-slate-100">
              {recentOrders.map((order) => (
                <li
                  key={order.id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {order.clientName}
                    </p>
                    <p className="text-xs text-slate-400">
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

        <div className="flex flex-col gap-3 rounded-xl bg-slate-950 p-4 text-white sm:p-6">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold tracking-widest text-cyan-300 uppercase">
              Conseil du jour
            </p>
            <AlertTriangle className="size-4 text-cyan-300" />
          </div>
          {attentionCount > 0 ? (
            <>
              <h3 className="text-lg font-semibold">Mettez vos stocks à jour</h3>
              <p className="text-sm text-white/70">
                {attentionCount} article{attentionCount > 1 ? "s" : ""}{" "}
                nécessite
                {attentionCount > 1 ? "nt" : ""} votre attention. Un stock bien
                suivi vous aide à ne manquer aucune vente.
              </p>
              <Link
                href="/dashboard/products"
                className="mt-1 w-fit rounded-lg bg-cyan-400 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-300"
              >
                Voir les alertes
              </Link>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold">Vos stocks sont à jour</h3>
              <p className="text-sm text-white/70">
                Aucun article ne nécessite votre attention pour le moment.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

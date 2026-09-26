"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { CategoryFilterPills } from "@/components/storefront/CategoryFilterPills";
import { ShopSummaryCard } from "@/components/storefront/ShopSummaryCard";
import { StorefrontProductCard } from "@/components/storefront/StorefrontProductCard";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { MarketProduct } from "@/hooks/useMarketCatalogue";
import type { Shop } from "@/models/shop/Shop";

// Assez pour donner un aperçu sans dupliquer toute la page "toutes les
// boutiques" — celle-ci reste à un clic via la flèche "Voir toutes les
// boutiques".
const SHOP_PREVIEW_LIMIT = 6;

type SortOrder = "newest" | "price-asc" | "price-desc";

function sortItems(items: MarketProduct[], order: SortOrder): MarketProduct[] {
  const sorted = [...items];
  switch (order) {
    case "price-asc":
      return sorted.sort((a, b) => a.product.price - b.product.price);
    case "price-desc":
      return sorted.sort((a, b) => b.product.price - a.product.price);
    case "newest":
    default:
      return sorted.sort(
        (a, b) =>
          b.product.createdAt.toDate().getTime() -
          a.product.createdAt.toDate().getTime()
      );
  }
}

/**
 * Grille de produits agrégeant plusieurs boutiques — recherche/filtre par
 * catégorie/tri/promo, bloc "Boutiques" avec flèche vers une page qui les
 * liste toutes. Partagée entre `MarketCataloguePageContent` (`/catalogue`,
 * vraies données, BF-108 §22) et `/demo-catalogue` (données de démo,
 * BF-125) — ce composant lui-même ne touche jamais Firestore, `items` est
 * déjà résolu par l'appelant (hook réel ou tableau synchrone de démo).
 */
export function CatalogueExplorer({
  items,
  hero,
  seeAllShopsHref,
  shopHref,
}: {
  items: MarketProduct[] | undefined;
  hero: ReactNode;
  seeAllShopsHref: string;
  /** Par défaut `/boutique/{shopId}` (vraies boutiques) — la démo la
   * remplace par `/demo-catalogue/boutique/{shopId}`. */
  shopHref?: (shopId: string) => string;
}) {
  const resolveShopHref = shopHref ?? ((shopId: string) => `/boutique/${shopId}`);
  const [term, setTerm] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  // Voir CataloguePageContent : window.location plutôt que useSearchParams()
  // pour éviter la limite Suspense de Next, cette page étant déjà
  // entièrement rendue côté client.
  const [promoOnly, setPromoOnly] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isPromo = params.get("promo") === "1";
    const initialTerm = params.get("q") ?? "";
    queueMicrotask(() => {
      setPromoOnly(isPromo);
      if (initialTerm) setTerm(initialTerm);
    });
  }, []);

  const shops = useMemo(() => {
    if (!items) return [];
    const seen = new Map<string, Shop>();
    for (const item of items) {
      if (!seen.has(item.shop.id)) seen.set(item.shop.id, item.shop);
    }
    return [...seen.values()];
  }, [items]);

  const categories = useMemo(() => {
    if (!items) return [];
    return Array.from(new Set(items.map((item) => item.product.category))).sort(
      (a, b) => a.localeCompare(b, "fr")
    );
  }, [items]);

  const visibleItems = useMemo(() => {
    if (!items) return [];
    const normalized = term.trim().toLowerCase();
    const bySearch = normalized
      ? items.filter(
          (item) =>
            item.product.name.toLowerCase().includes(normalized) ||
            item.product.category.toLowerCase().includes(normalized)
        )
      : items;
    const byCategory = category
      ? bySearch.filter((item) => item.product.category === category)
      : bySearch;
    const byPromo = promoOnly
      ? byCategory.filter((item) => item.product.isPromo)
      : byCategory;
    return sortItems(byPromo, sortOrder);
  }, [items, term, category, sortOrder, promoOnly]);

  if (items !== undefined && items.length === 0) {
    return (
      <p className="px-6 py-10 text-center text-sm text-muted-foreground">
        Aucun produit disponible pour le moment.
      </p>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-10">
      {hero}

      {shops.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Boutiques
            </h2>
            <Link
              href={seeAllShopsHref}
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Voir toutes les boutiques
              <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {shops.slice(0, SHOP_PREVIEW_LIMIT).map((shop) => (
              <ShopSummaryCard key={shop.id} shop={shop} href={resolveShopHref(shop.id)} />
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CategoryFilterPills
            categories={categories}
            selected={category}
            onSelect={setCategory}
          />
          <Input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Rechercher un article"
            aria-label="Rechercher un article"
            className="sm:max-w-xs"
          />
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {items === undefined
              ? "Chargement..."
              : `${visibleItems.length} article${visibleItems.length > 1 ? "s" : ""} disponible${visibleItems.length > 1 ? "s" : ""}`}
          </span>
          <label className="flex items-center gap-2">
            Trier par
            <Select
              value={sortOrder}
              onChange={(event) =>
                setSortOrder(event.target.value as SortOrder)
              }
              className="w-auto"
            >
              <option value="newest">Nouveautés</option>
              <option value="price-asc">Prix croissant</option>
              <option value="price-desc">Prix décroissant</option>
            </Select>
          </label>
        </div>

        {items !== undefined && visibleItems.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Aucun produit ne correspond à votre recherche.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visibleItems.map((item) => (
              <StorefrontProductCard
                key={item.product.id}
                product={item.product}
                shop={item.shop}
                shopHref={resolveShopHref(item.shop.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

"use client";

import { Sparkles, Truck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { CategoryFilterPills } from "@/components/storefront/CategoryFilterPills";
import { StorefrontProductCard } from "@/components/storefront/StorefrontProductCard";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useMarketCatalogue, type MarketProduct } from "@/hooks/useMarketCatalogue";

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
 * Catalogue public agrégeant TOUTES les boutiques publiées de la
 * plateforme (page Marché, BF-108 — version réduite : pas de classement
 * "meilleures boutiques" ni de tags système, voir
 * 04-besoins-techniques.md §22). Distinct de `CataloguePageContent`, qui
 * reste scopé à une seule boutique (`/boutique/[shopId]`) — les deux
 * partagent `StorefrontProductCard`/`CategoryFilterPills` mais pas la
 * logique de chargement : ici il n'y a pas de notion de "boutique vide"
 * (voir `/catalogue/page.tsx`, qui bascule vers `/demo-catalogue` avant
 * même de monter ce composant si aucune boutique n'a de produit réel).
 */
export function MarketCataloguePageContent() {
  const items = useMarketCatalogue();
  const [term, setTerm] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  // Voir CataloguePageContent : window.location plutôt que useSearchParams()
  // pour éviter la limite Suspense de Next, cette page étant déjà
  // entièrement rendue depuis Firestore côté client.
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
      <section className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex max-w-xl flex-col gap-4">
          <Badge icon={<Sparkles className="size-3.5" />} className="w-fit">
            La sélection ManuShop
          </Badge>
          <h1 className="text-4xl leading-tight font-bold">
            Des pièces qui racontent{" "}
            <span className="text-primary">votre style.</span>
          </h1>
          <p className="text-muted-foreground">
            Chaque article est photographié et classé par catégorie pour vous
            aider à choisir simplement.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-4">
          <Truck className="size-5 text-primary" />
          <div>
            <p className="text-sm font-semibold">Livraison offerte</p>
            <p className="text-sm text-muted-foreground">
              Dès 50 000 FCFA de commande
            </p>
          </div>
        </div>
      </section>

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
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

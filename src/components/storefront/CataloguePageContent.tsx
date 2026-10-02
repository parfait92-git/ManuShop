"use client";

import { Sparkles, Truck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { CategoryFilterPills } from "@/components/storefront/CategoryFilterPills";
import { StorefrontProductCard } from "@/components/storefront/StorefrontProductCard";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { Category } from "@/models/category/Category";
import type { Product } from "@/models/product/Product";
import { categoryService } from "@/services/CategoryService";
import { productService } from "@/services/ProductService";

type SortOrder = "newest" | "price-asc" | "price-desc";

function sortProducts(products: Product[], order: SortOrder): Product[] {
  const sorted = [...products];
  switch (order) {
    case "price-asc":
      return sorted.sort((a, b) => a.price - b.price);
    case "price-desc":
      return sorted.sort((a, b) => b.price - a.price);
    case "newest":
    default:
      return sorted.sort(
        (a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime()
      );
  }
}

export function CataloguePageContent({ shopId }: { shopId: string }) {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [term, setTerm] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  // Read via window.location rather than useSearchParams(): this whole page
  // is client-rendered from Firestore data anyway, and this sidesteps the
  // Suspense boundary Next requires around useSearchParams().
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

  useEffect(() => {
    let active = true;
    Promise.all([
      productService.listProducts(shopId),
      categoryService.listCategories(shopId),
    ])
      .then(([productList, categoryList]) => {
        if (!active) return;
        setProducts(productList);
        setCategories(categoryList);
      })
      .catch((error) => {
        // Sans catch, un échec ici laissait `products` bloqué sur `null`
        // pour toujours (page coincée sur "Chargement...") sans la moindre
        // trace en console — même esprit que useDemoCatalogueAvailable
        // (04-besoins-techniques.md §31).
        console.error(
          "CataloguePageContent : échec du chargement des produits/catégories",
          error
        );
        if (!active) return;
        setProducts([]);
        setCategories([]);
      });
    return () => {
      active = false;
    };
  }, [shopId]);

  const publishedProducts = useMemo(() => {
    if (!products) return [];
    return products.filter((product) =>
      productService.isVisibleToCustomers(product)
    );
  }, [products]);

  const visibleProducts = useMemo(() => {
    const bySearch = productService.search(publishedProducts, term);
    const byCategory = category
      ? bySearch.filter((product) => product.category === category)
      : bySearch;
    const byPromo = promoOnly
      ? byCategory.filter((product) => product.isPromo)
      : byCategory;
    return sortProducts(byPromo, sortOrder);
  }, [publishedProducts, term, category, sortOrder, promoOnly]);

  // La boutique existe et est publiée (vérifié par ShopStorefrontPage), mais
  // n'a encore aucun produit VISIBLE (aucun produit du tout, ou aucun
  // publié) — `publishedProducts`, pas `visibleProducts` qui peut être vide
  // à cause d'une recherche/filtre sans rapport avec ça. Toujours un état
  // honnête "aucun produit" ici, jamais un repli vers `/demo-catalogue` :
  // contrairement à `/catalogue` (le marché agrégé, qui bascule sur la démo
  // tant que RIEN n'est réel sur toute la plateforme), cette page est
  // atteinte en visitant UNE boutique précise, déjà confirmée publiée — la
  // rediriger vers une démo sans rapport serait plus déroutant qu'utile.
  const isEmptyShop = products !== null && publishedProducts.length === 0;

  if (isEmptyShop) {
    return (
      <p className="px-6 py-10 text-center text-sm text-muted-foreground">
        Cette boutique n&apos;a pas encore de produit à afficher.
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
        <div data-tour="shop-contact" className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-4">
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
        <div data-tour="catalogue-filters" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CategoryFilterPills
            categories={categories.map((c) => ({ value: c.name, label: c.name }))}
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

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>
            {products === null
              ? "Chargement..."
              : `${visibleProducts.length} article${visibleProducts.length > 1 ? "s" : ""} disponible${visibleProducts.length > 1 ? "s" : ""}`}
          </span>
          <label data-tour="catalogue-sort" className="flex items-center gap-2">
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

        {products !== null && visibleProducts.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Aucun produit ne correspond à votre recherche.
          </p>
        ) : (
          <div data-tour="catalogue-products" className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visibleProducts.map((product) => (
              <StorefrontProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

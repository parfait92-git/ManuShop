"use client";

import { useMemo } from "react";

import { ProductShowcase, type ShowcaseProduct } from "@/components/sections/ProductShowcase";
import { getFeaturedArticles } from "@/data/mockData";
import { useDemoCatalogueAvailable } from "@/hooks/useDemoCatalogueAvailable";
import { useMarketCatalogue, type MarketProduct } from "@/hooks/useMarketCatalogue";
import type { Product } from "@/models/product/Product";
import { productService } from "@/services/ProductService";

// Un dégradé par boutique de démo plutôt que par position dans la liste,
// pour que la carte reste visuellement liée à la boutique même si le
// classement (voir getFeaturedArticles) change lequel des 6 apparaît ici.
const DEMO_GRADIENTS: Record<string, string> = {
  "shop-laiterie-wouri": "linear-gradient(160deg, #38bdf8 0%, #2563eb 100%)",
  "shop-embacam": "linear-gradient(160deg, #34d399 0%, #059669 100%)",
  "shop-aromes-saveurs": "linear-gradient(160deg, #fbbf24 0%, #d97706 100%)",
  "shop-mode-237": "linear-gradient(160deg, #d946ef 0%, #7c3aed 100%)",
  "shop-techpoint": "linear-gradient(160deg, #22d3ee 0%, #2563eb 100%)",
  "shop-beaute-naturelle":
    "linear-gradient(160deg, #fb923c 0%, #f59e0b 55%, #f472b6 100%)",
};

// Les vraies boutiques ont un id Firestore arbitraire (pas dans la liste
// ci-dessus) : dégradé choisi par hash plutôt que codé en dur par boutique,
// mais toujours le même pour une boutique donnée (pas aléatoire à chaque
// rendu).
const REAL_GRADIENTS = [
  "linear-gradient(160deg, #38bdf8 0%, #2563eb 100%)",
  "linear-gradient(160deg, #34d399 0%, #059669 100%)",
  "linear-gradient(160deg, #fbbf24 0%, #d97706 100%)",
  "linear-gradient(160deg, #d946ef 0%, #7c3aed 100%)",
  "linear-gradient(160deg, #22d3ee 0%, #2563eb 100%)",
  "linear-gradient(160deg, #fb923c 0%, #f59e0b 55%, #f472b6 100%)",
];

function gradientForRealShop(shopId: string): string {
  let hash = 0;
  for (let i = 0; i < shopId.length; i += 1) {
    hash = (hash * 31 + shopId.charCodeAt(i)) | 0;
  }
  return REAL_GRADIENTS[Math.abs(hash) % REAL_GRADIENTS.length];
}

function priceLabel(product: Product): string {
  const price = product.isPromo && product.promoPrice ? product.promoPrice : product.price;
  return `${price.toLocaleString("fr-FR")} FCFA`;
}

function demoShowcase(): ShowcaseProduct[] {
  return getFeaturedArticles(3).map((article) => ({
    category: article.category,
    name: article.name,
    priceLabel: priceLabel(article),
    gradient: DEMO_GRADIENTS[article.shopId] ?? DEMO_GRADIENTS["shop-mode-237"],
    image: article.images[0],
  }));
}

/** Le meilleur article de chaque boutique (voir `compareByRelevance`), puis
 * les 3 meilleurs parmi eux — garantit des boutiques distinctes plutôt que
 * plusieurs articles d'une même boutique (même règle que
 * `getFeaturedArticles`, appliquée ici à de vraies données). */
function realShowcase(items: MarketProduct[]): ShowcaseProduct[] {
  const topPerShop = new Map<string, MarketProduct>();
  for (const item of items) {
    const current = topPerShop.get(item.shop.id);
    if (!current || productService.compareByRelevance(item.product, current.product) < 0) {
      topPerShop.set(item.shop.id, item);
    }
  }

  return [...topPerShop.values()]
    .sort((a, b) => productService.compareByRelevance(a.product, b.product))
    .slice(0, 3)
    .map(({ product, shop }) => ({
      category: product.category,
      name: product.name,
      priceLabel: priceLabel(product),
      gradient: gradientForRealShop(shop.id),
      image: product.images[0],
    }));
}

/**
 * "Meilleurs articles des meilleures boutiques" sur la landing page —
 * données de démo tant qu'aucune vraie boutique publiée n'a de produit
 * visible réel (`useDemoCatalogueAvailable`, même signal que
 * `/catalogue`/`/demo-catalogue`), vraies données ensuite. Pas de
 * `statLabel` ("+120% de commandes ce mois") en mode réel : c'est un
 * chiffre marketing fabriqué pour la démo, pas une métrique suivie
 * (voir `ProductService.getBadge`, même principe).
 */
export function FeaturedShowcase() {
  const demoAvailable = useDemoCatalogueAvailable();
  const marketCatalogue = useMarketCatalogue();

  const products = useMemo(() => {
    if (demoAvailable === undefined) return undefined;
    if (demoAvailable) return demoShowcase();
    if (marketCatalogue === undefined) return undefined;
    return realShowcase(marketCatalogue);
  }, [demoAvailable, marketCatalogue]);

  if (!products || products.length === 0) return null;

  return (
    <ProductShowcase
      id="boutique"
      eyebrow="La sélection du moment"
      title="Vendez plus simplement."
      statLabel={demoAvailable ? "+120% de commandes ce mois" : undefined}
      products={products}
    />
  );
}

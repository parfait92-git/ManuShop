"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/providers/AuthProvider";
import { StorefrontProductCard } from "@/components/storefront/StorefrontProductCard";
import type { MarketProduct } from "@/hooks/useMarketCatalogue";
import type { Product } from "@/models/product/Product";
import { productService } from "@/services/ProductService";
import { shopService } from "@/services/ShopService";

/**
 * BF-129 : mise en page volontairement simple (pas de recherche/filtre
 * comme `CatalogueExplorer`) — une liste de favoris reste courte par
 * nature. Rendue sous `ProtectedRoute` (voir page.tsx) : `useAuth()` reste
 * appelé ici quand même, pour rester réactive si les favoris changent
 * pendant que la page est ouverte (retirer un cœur ici doit faire
 * disparaître l'article de la liste tout de suite).
 */
export function FavoritesPageContent() {
  const { firebaseUser, profile } = useAuth();
  const [items, setItems] = useState<MarketProduct[] | undefined>(undefined);

  const favoriteIds = profile?.favoriteProductIds ?? [];
  // Clé stable (pas le tableau lui-même, une nouvelle référence à chaque
  // mise à jour optimiste) pour ne retrigger l'effet que sur un vrai
  // changement de contenu.
  const favoriteIdsKey = favoriteIds.join(",");

  useEffect(() => {
    let active = true;
    const ids = firebaseUser ? favoriteIds : [];

    Promise.all(ids.map((id) => productService.getProduct(id)))
      .then((products) => {
        const found = products.filter((product): product is Product => product !== null);
        return Promise.all(
          found.map((product) =>
            shopService.getShop(product.shopId).then((shop) => (shop ? { product, shop } : null))
          )
        );
      })
      .then((pairs) => {
        if (active) {
          setItems(pairs.filter((pair): pair is MarketProduct => pair !== null));
        }
      })
      .catch(() => {
        if (active) setItems([]);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `favoriteIdsKey` remplace `favoriteIds` (tableau) exprès.
  }, [firebaseUser, favoriteIdsKey]);

  if (items === undefined) {
    return (
      <p className="px-6 py-10 text-center text-sm text-muted-foreground">
        Chargement...
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-6 py-16 text-center">
        <Heart className="size-8 text-muted-foreground" />
        <p>Vous n&apos;avez encore aucun favori.</p>
        <Link href="/catalogue" className="text-sm text-primary underline">
          Découvrir le catalogue
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
      <h1 className="text-3xl font-bold">Mes favoris</h1>
      <div data-tour="favorites-grid" className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ product, shop }) => (
          <StorefrontProductCard key={product.id} product={product} shop={shop} />
        ))}
      </div>
    </div>
  );
}

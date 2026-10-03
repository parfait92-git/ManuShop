"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

import { Badge } from "@/components/ui/Badge";
import { CatalogueExplorer } from "@/components/storefront/CatalogueExplorer";
import { PageTour } from "@/components/onboarding/PageTour";
import {
  getArticlesByShop,
  getCategoriesByShop,
  mockCategoryTags,
  mockShops,
} from "@/data/mockData";
import { useDemoCatalogueAvailable } from "@/hooks/useDemoCatalogueAvailable";
import type { MarketProduct } from "@/hooks/useMarketCatalogue";

/**
 * Catalogue multi-boutiques de démonstration — simule le comportement réel
 * de `/catalogue` (BF-108 §22/BF-125 §23) avec les données de
 * `src/data/mockData.ts` : grille de produits mélangés (jamais groupés par
 * boutique comme avant, voir 06-journal-progression.md), bloc "Boutiques"
 * avec flèche vers `/demo-catalogue/boutiques`, et chaque carte produit
 * renvoie vers `/demo-catalogue/boutique/{shopId}` plutôt que la vraie
 * `/boutique/{shopId}` (qui ne connaît que Firestore). Rendue uniquement à
 * partir de données de démo, jamais de Firestore, comme avant.
 *
 * Auto-repli vers `/catalogue` (inchangé) : cette page se désactive
 * elle-même une fois qu'une vraie boutique publiée existe quelque part sur
 * la plateforme, ou si le Super Admin l'a coupée à la main.
 */
export default function DemoCataloguePage() {
  const router = useRouter();
  const available = useDemoCatalogueAvailable();

  useEffect(() => {
    if (available === false) {
      router.replace("/catalogue");
    }
  }, [available, router]);

  const items: MarketProduct[] = useMemo(
    () =>
      mockShops.flatMap((shop) => {
        const tagByCategoryName = new Map(
          getCategoriesByShop(shop.id).map((category) => [
            category.name,
            mockCategoryTags.find((tag) => tag.id === category.tagId),
          ])
        );
        return getArticlesByShop(shop.id).map((product) => ({
          product,
          shop,
          tag: tagByCategoryName.get(product.category),
        }));
      }),
    []
  );

  if (available === undefined || available === false) {
    return (
      <p className="px-6 py-10 text-center text-sm text-muted-foreground">
        Chargement...
      </p>
    );
  }

  return (
    <>
      <PageTour tourId="storefront-catalogue" />
      <CatalogueExplorer
        items={items}
        seeAllShopsHref="/demo-catalogue/boutiques"
        shopHref={(shopId) => `/demo-catalogue/boutique/${shopId}`}
        hero={
          <section className="flex flex-col gap-4">
            <Badge icon={<Sparkles className="size-3.5" />} className="w-fit">
              Démo — données fictives
            </Badge>
            <h1 className="text-4xl leading-tight font-bold">
              Le catalogue multi-boutiques de ManuShop
            </h1>
            <p className="max-w-2xl text-muted-foreground">
              {mockShops.length} boutiques de démonstration, réparties dans
              plusieurs villes du Cameroun et secteurs d&apos;activité.
            </p>
          </section>
        }
      />
    </>
  );
}

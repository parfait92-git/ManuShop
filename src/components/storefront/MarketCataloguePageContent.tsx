"use client";

import { Sparkles, Truck } from "lucide-react";

import { CatalogueExplorer } from "@/components/storefront/CatalogueExplorer";
import { Badge } from "@/components/ui/Badge";
import { useMarketCatalogue } from "@/hooks/useMarketCatalogue";

/**
 * Catalogue public agrégeant TOUTES les boutiques publiées de la
 * plateforme (page Marché, BF-108 — version réduite : pas de classement
 * "meilleures boutiques" ni de tags système, voir
 * 04-besoins-techniques.md §22). Distinct de `CataloguePageContent`, qui
 * reste scopé à une seule boutique (`/boutique/[shopId]`). Grille/filtres/
 * bloc "Boutiques" délégués à `CatalogueExplorer`, partagé avec
 * `/demo-catalogue` (BF-125) — seule différence : ici les données viennent
 * de Firestore (`useMarketCatalogue`), là de `src/data/mockData.ts`.
 */
export function MarketCataloguePageContent() {
  const items = useMarketCatalogue();

  return (
    <CatalogueExplorer
      items={items}
      seeAllShopsHref="/boutiques"
      hero={
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
              Chaque article est photographié et classé par catégorie pour
              vous aider à choisir simplement.
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
      }
    />
  );
}

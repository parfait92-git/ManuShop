"use client";

import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { ShopSummaryCard } from "@/components/storefront/ShopSummaryCard";
import { Badge } from "@/components/ui/Badge";
import type { Shop } from "@/models/shop/Shop";
import { shopService } from "@/services/ShopService";

/**
 * Liste toutes les boutiques publiées (flèche "Voir toutes les boutiques"
 * depuis le catalogue agrégé, `MarketCataloguePageContent`). Chaque carte
 * (`ShopSummaryCard`) renvoie vers la page dédiée de la boutique
 * (`/boutique/[shopId]`, déjà construite).
 */
export function AllShopsPageContent() {
  const [shops, setShops] = useState<Shop[] | undefined>(undefined);

  useEffect(() => {
    let active = true;
    shopService
      .listPublishedShops()
      .then((data) => {
        if (active) setShops(data);
      })
      .catch(() => {
        if (active) setShops([]);
      });
    return () => {
      active = false;
    };
  }, []);

  if (shops === undefined) {
    return (
      <p className="px-6 py-10 text-center text-sm text-muted-foreground">
        Chargement...
      </p>
    );
  }

  if (shops.length === 0) {
    return (
      <p className="px-6 py-10 text-center text-sm text-muted-foreground">
        Aucune boutique disponible pour le moment.
      </p>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
      <section className="flex flex-col gap-3">
        <Badge icon={<Sparkles className="size-3.5" />} className="w-fit">
          Toutes les boutiques
        </Badge>
        <h1 className="text-3xl font-bold">
          {shops.length} boutique{shops.length > 1 ? "s" : ""} sur ManuShop
        </h1>
        <p className="text-muted-foreground">
          Choisissez une boutique pour découvrir tous ses produits.
        </p>
      </section>

      <div data-tour="shops-directory" className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {shops.map((shop) => (
          <ShopSummaryCard key={shop.id} shop={shop} />
        ))}
      </div>
    </div>
  );
}

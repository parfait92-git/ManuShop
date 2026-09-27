"use client";

import { Store } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import type { Shop } from "@/models/shop/Shop";

/**
 * Carte résumée d'une boutique — partagée entre le mini-bloc "Boutiques" du
 * catalogue agrégé (`MarketCataloguePageContent`) et la page listant toutes
 * les boutiques publiées (`/boutiques`). Renvoie toujours vers la page
 * dédiée de la boutique (`/boutique/[shopId]`, déjà construite pour le
 * partage de lien, BF-64/91).
 */
export function ShopSummaryCard({
  shop,
  href,
}: {
  shop: Shop;
  /** Par défaut `/boutique/{shopId}` — la démo (BF-125) la remplace par
   * l'équivalent `/demo-catalogue/boutique/{shopId}`. */
  href?: string;
}) {
  return (
    <Link
      href={href ?? `/boutique/${shop.id}`}
      className="group flex flex-col gap-2 rounded-xl border border-border p-3 transition-colors hover:bg-muted/40"
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted">
        {shop.logo ? (
          <Image
            src={shop.logo}
            alt={shop.name}
            fill
            sizes="(min-width: 1024px) 16vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-110 group-focus-visible:scale-110"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <Store className="size-6 text-muted-foreground" />
          </div>
        )}
      </div>
      <div>
        <p className="truncate text-sm font-semibold">{shop.name}</p>
        {(shop.sector || shop.address) && (
          <p className="truncate text-xs text-muted-foreground">
            {[shop.sector, shop.address].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
    </Link>
  );
}

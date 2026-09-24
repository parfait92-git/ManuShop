"use client";

import { Sparkles } from "lucide-react";
import Image from "next/image";

import { StorefrontProductCard } from "@/components/storefront/StorefrontProductCard";
import { Badge } from "@/components/ui/Badge";
import { getArticlesByShop, mockShops } from "@/data/mockData";

/**
 * Page de démonstration du catalogue multi-boutiques (Module 12) — rendue
 * uniquement à partir de `src/data/mockData.ts`, jamais de Firestore. Pas
 * liée au flux réel (une vraie boutique publiée vivra sur sa propre URL,
 * §11.3) : juste de quoi visualiser plusieurs boutiques et leurs articles
 * ensemble avant que ce routing existe.
 *
 * `"use client"`, comme `/catalogue` (`CataloguePageContent`) : les
 * `Timestamp` Firestore de `mockData.ts` perdent leurs méthodes
 * (`.toDate()`) s'ils traversent la frontière Server → Client Component
 * (sérialisation RSC), ce que `ProductService.getBadge()` utilise — la
 * page doit donc rester entièrement côté client, pas seulement le contenu.
 */
export default function DemoCataloguePage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-10">
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

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Boutiques
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {mockShops.map((shop) => (
            <a
              key={shop.id}
              href={`#${shop.id}`}
              className="flex flex-col gap-2 rounded-xl border border-border p-3 transition-colors hover:bg-muted/40"
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted">
                <Image
                  src={shop.logo}
                  alt={shop.name}
                  fill
                  sizes="(min-width: 1024px) 16vw, 33vw"
                  className="object-cover"
                />
              </div>
              <div>
                <p className="text-sm font-semibold">{shop.name}</p>
                <p className="text-xs text-muted-foreground">
                  {shop.sector} · {shop.address}
                </p>
              </div>
            </a>
          ))}
        </div>
      </section>

      {mockShops.map((shop) => {
        const articles = getArticlesByShop(shop.id);
        return (
          <section id={shop.id} key={shop.id} className="flex scroll-mt-20 flex-col gap-4">
            <div className="flex items-center gap-3 border-t border-border pt-8">
              <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                <Image
                  src={shop.logo}
                  alt={shop.name}
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              </div>
              <div>
                <h2 className="text-xl font-semibold">{shop.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {shop.sector} · {shop.address}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {articles.map((article) => (
                <StorefrontProductCard key={article.id} product={article} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

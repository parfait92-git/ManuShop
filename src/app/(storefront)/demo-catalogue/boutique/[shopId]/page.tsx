"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

import { useShopBranding } from "@/components/providers/ShopBrandingProvider";
import { StorefrontProductCard } from "@/components/storefront/StorefrontProductCard";
import { getArticlesByShop, mockShops } from "@/data/mockData";
import { useDemoCatalogueAvailable } from "@/hooks/useDemoCatalogueAvailable";

/**
 * Équivalent démo de `/boutique/[shopId]` (BF-64/BF-125) — la page vers
 * laquelle renvoie une boutique choisie depuis `/demo-catalogue` ou
 * `/demo-catalogue/boutiques`. Fait remonter le logo/nom de la boutique de
 * démo jusqu'à `StorefrontHeader` comme la vraie page (BF-124), même repli
 * auto vers `/catalogue` que le reste du catalogue de démo.
 */
export default function DemoShopStorefrontPage() {
  const { shopId } = useParams<{ shopId: string }>();
  const router = useRouter();
  const available = useDemoCatalogueAvailable();
  const { setBranding } = useShopBranding();
  const shop = mockShops.find((candidate) => candidate.id === shopId) ?? null;

  useEffect(() => {
    if (available === false) {
      router.replace("/catalogue");
    }
  }, [available, router]);

  useEffect(() => {
    if (shop) {
      setBranding({ shopId: shop.id, name: shop.name, logo: shop.logo });
    }
    return () => setBranding(null);
  }, [shop, setBranding]);

  if (available === undefined || available === false) {
    return (
      <p className="px-6 py-10 text-center text-sm text-muted-foreground">
        Chargement...
      </p>
    );
  }

  if (!shop) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-6 py-16 text-center">
        <p>Boutique de démo introuvable.</p>
        <Link href="/demo-catalogue" className="text-sm text-primary underline">
          Retour au catalogue de démo
        </Link>
      </div>
    );
  }

  const articles = getArticlesByShop(shop.id);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-bold">{shop.name}</h1>
        <p className="text-sm text-muted-foreground">
          {shop.sector} · {shop.address}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <StorefrontProductCard key={article.id} product={article} />
        ))}
      </div>
    </div>
  );
}

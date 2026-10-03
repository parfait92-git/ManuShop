"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { ShopSummaryCard } from "@/components/storefront/ShopSummaryCard";
import { Badge } from "@/components/ui/Badge";
import { PageTour } from "@/components/onboarding/PageTour";
import { mockShops } from "@/data/mockData";
import { useDemoCatalogueAvailable } from "@/hooks/useDemoCatalogueAvailable";

/**
 * Équivalent démo de `/boutiques` (BF-125) — liste toutes les boutiques de
 * démonstration. Chaque carte renvoie vers `/demo-catalogue/boutique/
 * {shopId}`, pas vers la vraie `/boutique/{shopId}` (qui ne connaît que
 * Firestore). Même repli auto vers `/catalogue` que `/demo-catalogue`,
 * couvre aussi l'accès direct par URL.
 */
export default function DemoAllShopsPage() {
  const router = useRouter();
  const available = useDemoCatalogueAvailable();

  useEffect(() => {
    if (available === false) {
      router.replace("/catalogue");
    }
  }, [available, router]);

  if (available === undefined || available === false) {
    return (
      <p className="px-6 py-10 text-center text-sm text-muted-foreground">
        Chargement...
      </p>
    );
  }

  return (
    <>
      <PageTour tourId="storefront-shops" />
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
        <section className="flex flex-col gap-3">
          <Badge icon={<Sparkles className="size-3.5" />} className="w-fit">
            Démo — toutes les boutiques
          </Badge>
          <h1 className="text-3xl font-bold">
            {mockShops.length} boutiques de démonstration
          </h1>
          <p className="text-muted-foreground">
            Choisissez une boutique pour découvrir tous ses produits.
          </p>
        </section>

        <div data-tour="shops-directory" className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {mockShops.map((shop) => (
            <ShopSummaryCard
              key={shop.id}
              shop={shop}
              href={`/demo-catalogue/boutique/${shop.id}`}
            />
          ))}
        </div>
      </div>
    </>
  );
}

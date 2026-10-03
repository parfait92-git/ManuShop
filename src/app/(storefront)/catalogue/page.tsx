"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { MarketCataloguePageContent } from "@/components/storefront/MarketCataloguePageContent";
import { PageTour } from "@/components/onboarding/PageTour";
import { useClearShopBranding } from "@/components/providers/ShopBrandingProvider";
import { useDemoCatalogueAvailable } from "@/hooks/useDemoCatalogueAvailable";

/**
 * Marché multi-boutique (BF-108, version réduite) : agrège toutes les
 * boutiques publiées de la plateforme plutôt qu'une seule "boutique
 * primaire" (`useShop()`, mono-tenant — utilisé ailleurs pour le panier/
 * paiement, hors scope ici, voir 04-besoins-techniques.md §22). Bascule
 * vers `/demo-catalogue` tant qu'aucune vraie boutique publiée n'a de
 * produit visible réel quelque part sur la plateforme (même signal que
 * `MarketCataloguePageContent` utiliserait pour se retrouver vide).
 */
export default function CataloguePage() {
  // Marché de la plateforme : on quitte le site d'une boutique.
  useClearShopBranding();
  const demoAvailable = useDemoCatalogueAvailable();
  const router = useRouter();

  const redirectToDemo = demoAvailable === true;

  useEffect(() => {
    if (redirectToDemo) {
      router.replace("/demo-catalogue");
    }
  }, [redirectToDemo, router]);

  if (demoAvailable === undefined || redirectToDemo) {
    return (
      <p className="px-6 py-10 text-center text-sm text-muted-foreground">
        Chargement...
      </p>
    );
  }

  return (
    <>
      <PageTour tourId="storefront-catalogue" />
      <MarketCataloguePageContent />
    </>
  );
}

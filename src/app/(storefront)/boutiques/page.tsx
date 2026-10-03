"use client";

import { AllShopsPageContent } from "@/components/storefront/AllShopsPageContent";
import { PageTour } from "@/components/onboarding/PageTour";
import { useClearShopBranding } from "@/components/providers/ShopBrandingProvider";

export default function AllShopsPage() {
  // Annuaire de la plateforme : on quitte le site d'une boutique.
  useClearShopBranding();
  return (
    <>
      <PageTour tourId="storefront-shops" />
      <AllShopsPageContent />
    </>
  );
}

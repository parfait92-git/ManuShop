"use client";

import { AllShopsPageContent } from "@/components/storefront/AllShopsPageContent";
import { PageTour } from "@/components/onboarding/PageTour";

export default function AllShopsPage() {
  return (
    <>
      <PageTour tourId="storefront-shops" />
      <AllShopsPageContent />
    </>
  );
}

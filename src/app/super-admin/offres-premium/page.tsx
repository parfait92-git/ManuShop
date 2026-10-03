"use client";

import { PageTour } from "@/components/onboarding/PageTour";
import { PremiumOffersPageContent } from "@/components/super-admin/PremiumOffersPageContent";

export default function PremiumOffersPage() {
  return (
    <>
      <PageTour tourId="super-admin-premium" />
      <PremiumOffersPageContent />
    </>
  );
}

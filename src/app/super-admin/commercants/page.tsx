"use client";

import { MerchantsPageContent } from "@/components/super-admin/MerchantsPageContent";
import { PageTour } from "@/components/onboarding/PageTour";

export default function MerchantsPage() {
  return (
    <>
      <PageTour tourId="super-admin-merchants" />
      <MerchantsPageContent />
    </>
  );
}

"use client";

import { SupportPageContent } from "@/components/dashboard/SupportPageContent";
import { PageTour } from "@/components/onboarding/PageTour";

export default function SupportPage() {
  return (
    <>
      <PageTour tourId="dashboard-support" />
      <SupportPageContent />
    </>
  );
}

"use client";

import { PageTour } from "@/components/onboarding/PageTour";
import { UserGuidePageContent } from "@/components/super-admin/guide/UserGuidePageContent";

export default function UserGuidePage() {
  return (
    <>
      <PageTour tourId="super-admin-guide" />
      <UserGuidePageContent />
    </>
  );
}

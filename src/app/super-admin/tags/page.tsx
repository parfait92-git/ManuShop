"use client";

import { CategoryTagsPageContent } from "@/components/super-admin/CategoryTagsPageContent";
import { PageTour } from "@/components/onboarding/PageTour";

export default function CategoryTagsPage() {
  return (
    <>
      <PageTour tourId="super-admin-tags" />
      <CategoryTagsPageContent />
    </>
  );
}

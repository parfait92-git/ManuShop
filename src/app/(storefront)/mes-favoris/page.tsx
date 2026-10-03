"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { FavoritesPageContent } from "@/components/storefront/FavoritesPageContent";
import { PageTour } from "@/components/onboarding/PageTour";

export default function FavoritesPage() {
  return (
    <>
      <PageTour tourId="storefront-favorites" />
      <ProtectedRoute>
        <FavoritesPageContent />
      </ProtectedRoute>
    </>
  );
}

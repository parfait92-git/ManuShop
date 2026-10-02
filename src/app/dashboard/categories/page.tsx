"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/components/providers/AuthProvider";
import { CategoriesPageContent } from "@/components/dashboard/CategoriesPageContent";
import { PageTour } from "@/components/onboarding/PageTour";

export default function CategoriesPage() {
  const { profile } = useAuth();

  return (
    <>
      <PageTour tourId="dashboard-categories" />
      <ProtectedRoute allowedRoles={["admin", "seller"]}>
        {profile?.shopId ? (
          <CategoriesPageContent shopId={profile.shopId} />
        ) : (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        )}
      </ProtectedRoute>
    </>
  );
}

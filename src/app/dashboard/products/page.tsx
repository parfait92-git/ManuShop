"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/components/providers/AuthProvider";
import { ProductsPageContent } from "@/components/dashboard/ProductsPageContent";
import { PageTour } from "@/components/onboarding/PageTour";

export default function ProductsPage() {
  const { profile } = useAuth();

  return (
    <>
      <PageTour tourId="dashboard-products" />
      <ProtectedRoute allowedRoles={["admin", "seller"]}>
        {profile?.shopId ? (
          <ProductsPageContent shopId={profile.shopId} />
        ) : (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        )}
      </ProtectedRoute>
    </>
  );
}

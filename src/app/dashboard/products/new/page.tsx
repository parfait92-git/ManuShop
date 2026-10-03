"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/components/providers/AuthProvider";
import { ProductFormPageContent } from "@/components/dashboard/ProductFormPageContent";
import { PageTour } from "@/components/onboarding/PageTour";

export default function NewProductPage() {
  const { profile } = useAuth();

  return (
    <>
      <PageTour tourId="dashboard-product-form" />
      <ProtectedRoute allowedRoles={["admin", "seller"]}>
        {profile?.shopId ? (
          <ProductFormPageContent shopId={profile.shopId} />
        ) : (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        )}
      </ProtectedRoute>
    </>
  );
}

"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/components/providers/AuthProvider";
import { OrdersPageContent } from "@/components/dashboard/OrdersPageContent";
import { PageTour } from "@/components/onboarding/PageTour";

export default function OrdersPage() {
  const { profile } = useAuth();

  return (
    <>
      <PageTour tourId="dashboard-orders" />
      <ProtectedRoute allowedRoles={["admin", "seller"]}>
        {profile?.shopId ? (
          <OrdersPageContent shopId={profile.shopId} />
        ) : (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        )}
      </ProtectedRoute>
    </>
  );
}

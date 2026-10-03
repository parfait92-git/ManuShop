"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { StockReportsPageContent } from "@/components/dashboard/reports/StockReportsPageContent";
import { PageTour } from "@/components/onboarding/PageTour";
import { useAuth } from "@/components/providers/AuthProvider";

export default function StockReportsPage() {
  const { profile } = useAuth();

  return (
    <>
      <PageTour tourId="dashboard-reports" />
      <ProtectedRoute allowedRoles={["admin", "seller"]}>
        {profile?.shopId ? (
          <StockReportsPageContent shopId={profile.shopId} />
        ) : (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        )}
      </ProtectedRoute>
    </>
  );
}

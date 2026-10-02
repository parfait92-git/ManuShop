"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ShopManagementPageContent } from "@/components/dashboard/ShopManagementPageContent";
import { PageTour } from "@/components/onboarding/PageTour";

export default function ShopsPage() {
  return (
    <>
      <PageTour tourId="dashboard-shops" />
      <ProtectedRoute allowedRoles={["admin"]}>
        <ShopManagementPageContent />
      </ProtectedRoute>
    </>
  );
}

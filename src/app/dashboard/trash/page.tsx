"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/components/providers/AuthProvider";
import { TrashPageContent } from "@/components/dashboard/TrashPageContent";
import { PageTour } from "@/components/onboarding/PageTour";

export default function TrashPage() {
  const { profile } = useAuth();

  return (
    <>
      <PageTour tourId="dashboard-trash" />
      <ProtectedRoute allowedRoles={["admin", "seller"]}>
        {profile?.shopId ? (
          <TrashPageContent shopId={profile.shopId} />
        ) : (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        )}
      </ProtectedRoute>
    </>
  );
}

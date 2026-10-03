"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ThemesPageContent } from "@/components/dashboard/themes/ThemesPageContent";
import { PageTour } from "@/components/onboarding/PageTour";
import { useAuth } from "@/components/providers/AuthProvider";

export default function ThemesPage() {
  const { profile } = useAuth();

  return (
    <>
      <PageTour tourId="dashboard-themes" />
      <ProtectedRoute allowedRoles={["admin"]}>
        {profile?.shopId ? (
          <ThemesPageContent shopId={profile.shopId} />
        ) : (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        )}
      </ProtectedRoute>
    </>
  );
}

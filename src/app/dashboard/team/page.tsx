"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/components/providers/AuthProvider";
import { TeamPageContent } from "@/components/dashboard/TeamPageContent";
import { PageTour } from "@/components/onboarding/PageTour";

export default function TeamPage() {
  const { profile } = useAuth();

  return (
    <>
      <PageTour tourId="dashboard-team" />
      <ProtectedRoute allowedRoles={["admin"]}>
        {profile?.shopId ? (
          <TeamPageContent shopId={profile.shopId} />
        ) : (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        )}
      </ProtectedRoute>
    </>
  );
}

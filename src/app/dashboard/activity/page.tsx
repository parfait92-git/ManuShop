"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/components/providers/AuthProvider";
import { ActivityLogPageContent } from "@/components/dashboard/ActivityLogPageContent";
import { PageTour } from "@/components/onboarding/PageTour";

export default function ActivityPage() {
  const { profile } = useAuth();

  return (
    <>
      <PageTour tourId="dashboard-activity" />
      <ProtectedRoute allowedRoles={["admin", "seller"]}>
        {profile?.shopId ? (
          <ActivityLogPageContent shopId={profile.shopId} />
        ) : (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        )}
      </ProtectedRoute>
    </>
  );
}

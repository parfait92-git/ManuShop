"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { FeedbackPageContent } from "@/components/dashboard/FeedbackPageContent";
import { PageTour } from "@/components/onboarding/PageTour";
import { useAuth } from "@/components/providers/AuthProvider";

export default function FeedbackPage() {
  const { profile } = useAuth();

  return (
    <>
      <PageTour tourId="dashboard-feedback" />
      <ProtectedRoute allowedRoles={["admin", "seller"]}>
        {profile?.shopId ? (
          <FeedbackPageContent shopId={profile.shopId} />
        ) : (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        )}
      </ProtectedRoute>
    </>
  );
}

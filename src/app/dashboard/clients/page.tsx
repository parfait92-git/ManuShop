"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ClientsPageContent } from "@/components/dashboard/ClientsPageContent";
import { PageTour } from "@/components/onboarding/PageTour";
import { useAuth } from "@/components/providers/AuthProvider";

export default function ClientsPage() {
  const { profile } = useAuth();

  return (
    <>
      <PageTour tourId="dashboard-clients" />
      <ProtectedRoute allowedRoles={["admin", "seller"]}>
        {profile?.shopId ? (
          <ClientsPageContent shopId={profile.shopId} />
        ) : (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        )}
      </ProtectedRoute>
    </>
  );
}

"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { StatsPageContent } from "@/components/dashboard/StatsPageContent";
import { PageTour } from "@/components/onboarding/PageTour";
import { useAuth } from "@/components/providers/AuthProvider";

/** Gains et statistiques — réservé au gérant : prix d'achat et marges ne
 * sont pas montrés aux vendeurs (choix de l'utilisateur, 2026-10-02). */
export default function StatsPage() {
  const { profile } = useAuth();

  return (
    <>
      <PageTour tourId="dashboard-stats" />
      <ProtectedRoute allowedRoles={["admin"]}>
        {profile?.shopId ? (
          <StatsPageContent shopId={profile.shopId} />
        ) : (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        )}
      </ProtectedRoute>
    </>
  );
}

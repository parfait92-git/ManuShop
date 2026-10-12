"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PromotionsPageContent } from "@/components/dashboard/promotions/PromotionsPageContent";
import { PageTour } from "@/components/onboarding/PageTour";
import { useAuth } from "@/components/providers/AuthProvider";

/** Promotions de la boutique (2026-10-12) — réservées au gérant : les
 * prix sont son affaire. */
export default function PromotionsPage() {
  const { profile } = useAuth();
  return (
    <>
      <PageTour tourId="dashboard-promotions" />
      <ProtectedRoute allowedRoles={["admin"]}>
        {profile?.shopId ? (
          <PromotionsPageContent shopId={profile.shopId} />
        ) : (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        )}
      </ProtectedRoute>
    </>
  );
}

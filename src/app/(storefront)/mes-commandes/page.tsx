"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/components/providers/AuthProvider";
import { MyOrdersPageContent } from "@/components/storefront/MyOrdersPageContent";
import { PageTour } from "@/components/onboarding/PageTour";

export default function MyOrdersPage() {
  const { profile } = useAuth();

  return (
    <>
      <PageTour tourId="storefront-my-orders" />
      <ProtectedRoute>
        {profile ? (
          <MyOrdersPageContent clientId={profile.id} />
        ) : (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        )}
      </ProtectedRoute>
    </>
  );
}

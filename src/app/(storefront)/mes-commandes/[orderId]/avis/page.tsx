"use client";

import { useParams } from "next/navigation";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/components/providers/AuthProvider";
import { PageTour } from "@/components/onboarding/PageTour";
import { OrderFeedbackPageContent } from "@/components/storefront/OrderFeedbackPageContent";

export default function OrderFeedbackPage() {
  const { profile } = useAuth();
  const params = useParams<{ orderId: string }>();

  return (
    <>
      <PageTour tourId="storefront-order-feedback" />
      <ProtectedRoute>
        {profile ? (
          <OrderFeedbackPageContent orderId={params.orderId} clientId={profile.id} />
        ) : (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        )}
      </ProtectedRoute>
    </>
  );
}

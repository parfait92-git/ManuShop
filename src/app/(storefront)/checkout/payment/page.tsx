"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PaymentMethodPageContent } from "@/components/storefront/PaymentMethodPageContent";
import { PageTour } from "@/components/onboarding/PageTour";

// Pas de `allowedRoles` : n'importe quel compte connecté (client compris)
// peut atteindre cet écran — BF-74 (authentification de base uniquement).
export default function PaymentPage() {
  return (
    <>
      {/* Parcours d'achat : visite seulement à la demande (« ? »). */}
      <PageTour tourId="storefront-checkout" autoStart={false} />
      <ProtectedRoute>
        <PaymentMethodPageContent />
      </ProtectedRoute>
    </>
  );
}

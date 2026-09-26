"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PaymentMethodPageContent } from "@/components/storefront/PaymentMethodPageContent";

// Pas de `allowedRoles` : n'importe quel compte connecté (client compris)
// peut atteindre cet écran — BF-74 (authentification de base uniquement).
export default function PaymentPage() {
  return (
    <ProtectedRoute>
      <PaymentMethodPageContent />
    </ProtectedRoute>
  );
}

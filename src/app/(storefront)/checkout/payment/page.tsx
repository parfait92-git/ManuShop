"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PaymentMethodPageContent } from "@/components/storefront/PaymentMethodPageContent";

// Pas de `allowedRoles` : n'importe quel compte connecté (client compris)
// peut atteindre cet écran — BF-74 dans sa portée réduite pour cette
// tranche (authentification de base uniquement, pas la nuance "compte
// anonyme doit compléter son profil").
export default function PaymentPage() {
  return (
    <ProtectedRoute>
      <PaymentMethodPageContent />
    </ProtectedRoute>
  );
}

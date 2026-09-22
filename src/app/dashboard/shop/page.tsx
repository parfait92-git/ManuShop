"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/components/providers/AuthProvider";
import { ShopSettingsForm } from "@/components/dashboard/ShopSettingsForm";

export default function ShopSettingsPage() {
  const { profile } = useAuth();

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Paramètres de la boutique
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configurez les informations qui pilotent votre catalogue, vos
            publications et le suivi des commandes.
          </p>
        </div>
        {profile?.shopId ? (
          <ShopSettingsForm shopId={profile.shopId} />
        ) : (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        )}
      </div>
    </ProtectedRoute>
  );
}

"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/components/providers/AuthProvider";
import { ShopProfileForm } from "@/components/dashboard/ShopProfileForm";

export default function ShopSettingsPage() {
  const { profile } = useAuth();

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="mx-auto flex max-w-md flex-col gap-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Profil de la boutique
        </h1>
        {profile?.shopId ? (
          <ShopProfileForm shopId={profile.shopId} />
        ) : (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        )}
      </div>
    </ProtectedRoute>
  );
}

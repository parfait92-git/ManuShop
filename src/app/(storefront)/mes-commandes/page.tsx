"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/components/providers/AuthProvider";
import { MyOrdersPageContent } from "@/components/storefront/MyOrdersPageContent";

export default function MyOrdersPage() {
  const { profile } = useAuth();

  return (
    <ProtectedRoute>
      {profile ? (
        <MyOrdersPageContent clientId={profile.id} />
      ) : (
        <p className="text-sm text-muted-foreground">Chargement...</p>
      )}
    </ProtectedRoute>
  );
}

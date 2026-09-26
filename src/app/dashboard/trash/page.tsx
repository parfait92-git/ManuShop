"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/components/providers/AuthProvider";
import { TrashPageContent } from "@/components/dashboard/TrashPageContent";

export default function TrashPage() {
  const { profile } = useAuth();

  return (
    <ProtectedRoute allowedRoles={["admin", "seller"]}>
      {profile?.shopId ? (
        <TrashPageContent shopId={profile.shopId} />
      ) : (
        <p className="text-sm text-muted-foreground">Chargement...</p>
      )}
    </ProtectedRoute>
  );
}

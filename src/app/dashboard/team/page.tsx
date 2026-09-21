"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/components/providers/AuthProvider";
import { TeamPageContent } from "@/components/dashboard/TeamPageContent";

export default function TeamPage() {
  const { profile } = useAuth();

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      {profile?.shopId ? (
        <TeamPageContent shopId={profile.shopId} />
      ) : (
        <p className="text-sm text-muted-foreground">Chargement...</p>
      )}
    </ProtectedRoute>
  );
}

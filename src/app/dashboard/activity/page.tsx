"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/components/providers/AuthProvider";
import { ActivityLogPageContent } from "@/components/dashboard/ActivityLogPageContent";

export default function ActivityPage() {
  const { profile } = useAuth();

  return (
    <ProtectedRoute allowedRoles={["admin", "seller"]}>
      {profile?.shopId ? (
        <ActivityLogPageContent shopId={profile.shopId} />
      ) : (
        <p className="text-sm text-muted-foreground">Chargement...</p>
      )}
    </ProtectedRoute>
  );
}

"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/components/providers/AuthProvider";
import { ProductsPageContent } from "@/components/dashboard/ProductsPageContent";

export default function ProductsPage() {
  const { profile } = useAuth();

  return (
    <ProtectedRoute allowedRoles={["admin", "seller"]}>
      {profile?.shopId ? (
        <ProductsPageContent shopId={profile.shopId} />
      ) : (
        <p className="text-sm text-muted-foreground">Chargement...</p>
      )}
    </ProtectedRoute>
  );
}

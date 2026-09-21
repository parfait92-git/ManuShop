"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/components/providers/AuthProvider";
import { ProductFormPageContent } from "@/components/dashboard/ProductFormPageContent";

export default function NewProductPage() {
  const { profile } = useAuth();

  return (
    <ProtectedRoute allowedRoles={["admin", "seller"]}>
      {profile?.shopId ? (
        <ProductFormPageContent shopId={profile.shopId} />
      ) : (
        <p className="text-sm text-muted-foreground">Chargement...</p>
      )}
    </ProtectedRoute>
  );
}

"use client";

import { useParams } from "next/navigation";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/components/providers/AuthProvider";
import { ProductFormPageContent } from "@/components/dashboard/ProductFormPageContent";

export default function EditProductPage() {
  const { profile } = useAuth();
  const params = useParams<{ id: string }>();

  return (
    <ProtectedRoute allowedRoles={["admin", "seller"]}>
      {profile?.shopId ? (
        <ProductFormPageContent
          shopId={profile.shopId}
          productId={params.id}
        />
      ) : (
        <p className="text-sm text-muted-foreground">Chargement...</p>
      )}
    </ProtectedRoute>
  );
}

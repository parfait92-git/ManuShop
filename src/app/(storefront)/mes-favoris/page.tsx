"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { FavoritesPageContent } from "@/components/storefront/FavoritesPageContent";

export default function FavoritesPage() {
  return (
    <ProtectedRoute>
      <FavoritesPageContent />
    </ProtectedRoute>
  );
}

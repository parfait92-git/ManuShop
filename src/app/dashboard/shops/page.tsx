"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ShopManagementPageContent } from "@/components/dashboard/ShopManagementPageContent";

export default function ShopsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <ShopManagementPageContent />
    </ProtectedRoute>
  );
}

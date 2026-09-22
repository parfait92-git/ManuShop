import { ShoppingBag } from "lucide-react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ComingSoonCard } from "@/components/dashboard/ComingSoonCard";

export default function OrdersPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "seller"]}>
      <ComingSoonCard
        icon={ShoppingBag}
        title="Commandes"
        description="Le suivi des commandes arrive avec le module Commandes."
      />
    </ProtectedRoute>
  );
}

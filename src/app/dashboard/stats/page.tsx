import { BarChart3 } from "lucide-react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ComingSoonCard } from "@/components/dashboard/ComingSoonCard";

export default function StatsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "seller"]}>
      <ComingSoonCard
        icon={BarChart3}
        title="Statistiques"
        description="Les statistiques détaillées de votre boutique arrivent bientôt."
      />
    </ProtectedRoute>
  );
}

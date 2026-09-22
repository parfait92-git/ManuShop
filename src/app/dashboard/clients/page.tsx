import { Users } from "lucide-react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ComingSoonCard } from "@/components/dashboard/ComingSoonCard";

export default function ClientsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "seller"]}>
      <ComingSoonCard
        icon={Users}
        title="Clients"
        description="La gestion des comptes clients arrive dans une prochaine phase."
      />
    </ProtectedRoute>
  );
}

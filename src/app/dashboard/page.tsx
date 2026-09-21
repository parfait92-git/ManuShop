"use client";

import { useAuth } from "@/components/providers/AuthProvider";

export default function DashboardPage() {
  const { profile } = useAuth();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-2">
      <h1 className="text-2xl font-semibold tracking-tight">
        Bonjour{profile ? `, ${profile.displayName}` : ""}
      </h1>
      <p className="text-muted-foreground">
        Votre tableau de bord ManuShop est en cours de construction. Les
        modules Catalogue, Stock, Commandes et Facturation arrivent bientôt.
      </p>
    </div>
  );
}

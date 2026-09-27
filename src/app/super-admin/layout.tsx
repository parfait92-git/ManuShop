import type { Metadata } from "next";

import { SuperAdminShell } from "@/components/super-admin/SuperAdminShell";

// Titre d'onglet dédié — jusqu'ici cette page partageait le titre générique
// de tout le site (`src/app/layout.tsx`), sans rien pour la distinguer
// visuellement d'un tableau de bord marchand normal (demande utilisateur,
// voir 04-besoins-techniques.md §35). Un `layout.tsx` Server Component est
// nécessaire pour exporter `metadata` : `SuperAdminShell` reste "use client"
// pour `SuperAdminRoute`, qui ne peut pas l'exporter lui-même.
export const metadata: Metadata = {
  title: "Super Admin — ManuShop",
};

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SuperAdminShell>{children}</SuperAdminShell>;
}

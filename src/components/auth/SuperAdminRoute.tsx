"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/components/providers/AuthProvider";

/**
 * Garde de route pour la page Super Admin (Module 12, BF-67/BF-68). Ne
 * s'appuie PAS sur `profile.role` — `isSuperAdmin` reflète l'appartenance à
 * la collection `platformAdmins`, jamais un rôle sur le profil (voir
 * AuthProvider). Même comportement que `ProtectedRoute` : non connecté →
 * `/catalogue`, rôle non autorisé (ici, pas Super Admin) → `/erreur?code=403`.
 */
export function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { firebaseUser, isSuperAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!firebaseUser) {
      router.replace("/catalogue");
      return;
    }

    if (!isSuperAdmin) {
      router.replace("/erreur?code=403");
    }
  }, [loading, firebaseUser, isSuperAdmin, router]);

  if (loading || !firebaseUser || !isSuperAdmin) {
    return null;
  }

  return <>{children}</>;
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/components/providers/AuthProvider";
import { getRedirectParam } from "@/lib/redirectParam";

/**
 * Garde de route inverse de `ProtectedRoute` : bloque l'accès aux pages
 * réservées aux visiteurs non authentifiés (login, register, forgot-password).
 *
 * - Compte déjà onboardé (profil Firestore existant) → renvoyé vers la
 *   cible mémorisée dans `?redirect=` si présente (retour à une commande en
 *   cours, BF-143), sinon `/erreur?code=already-authenticated` comme avant
 *   (ces pages ne le concernent plus).
 * - Compte authentifié mais onboarding pas terminé (première connexion via
 *   Google/Facebook, boutique pas encore créée) → renvoyé vers
 *   `/onboarding` directement, pas vers `/erreur` : ce n'est pas une
 *   erreur, juste la suite logique du parcours.
 */
export function GuestRoute({ children }: { children: React.ReactNode }) {
  const { firebaseUser, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !firebaseUser) return;

    if (profile === null) {
      router.replace("/onboarding");
      return;
    }

    const redirectTarget = getRedirectParam(window.location.search);
    router.replace(redirectTarget ?? "/erreur?code=already-authenticated");
  }, [loading, firebaseUser, profile, router]);

  if (loading || firebaseUser) {
    return null;
  }

  return <>{children}</>;
}

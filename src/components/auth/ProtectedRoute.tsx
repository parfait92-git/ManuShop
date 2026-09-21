"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/components/providers/AuthProvider";
import type { UserRole } from "@/models/user/UserRole";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

/**
 * Garde de route optimiste (côté client) : l'authentification Firebase
 * étant gérée par le SDK client, l'autorisation réelle reste appliquée par
 * les règles Firestore. Ce composant ne fait qu'éviter d'afficher du
 * contenu protégé le temps de rediriger un visiteur non autorisé.
 *
 * Un utilisateur Firebase authentifié sans profil Firestore (première
 * connexion via Google/Facebook/téléphone/anonyme) est envoyé vers
 * `/onboarding` pour créer sa boutique, plutôt que d'être silencieusement
 * laissé passer.
 */
export function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { firebaseUser, profile, loading } = useAuth();
  const router = useRouter();

  const isUnauthorizedRole =
    !!allowedRoles && !!profile && !allowedRoles.includes(profile.role);

  useEffect(() => {
    if (loading) return;

    if (!firebaseUser) {
      router.replace("/login");
      return;
    }

    if (profile === null) {
      router.replace("/onboarding");
      return;
    }

    if (isUnauthorizedRole) {
      router.replace("/dashboard");
    }
  }, [loading, firebaseUser, profile, isUnauthorizedRole, router]);

  if (loading || !firebaseUser || profile === null || isUnauthorizedRole) {
    return null;
  }

  return <>{children}</>;
}

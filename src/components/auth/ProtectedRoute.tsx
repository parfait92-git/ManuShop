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
 * Non connecté → `/catalogue` (déconnexion ou session expirée en cours de
 * visite aussi bien qu'accès direct à une page protégée) : rester sur une
 * page d'erreur dédiée n'apportait rien qu'un visiteur ne retrouve pas déjà
 * dans l'en-tête public (lien "Se connecter"). Rôle non autorisé (`403`) en
 * revanche reste sur `/erreur`, un vrai message étant utile dans ce cas.
 * Voir `GuestRoute`, son inverse, pour les pages réservées aux visiteurs.
 *
 * Un utilisateur Firebase authentifié sans profil Firestore (première
 * connexion via Google/Facebook) est envoyé vers `/onboarding` pour créer
 * sa boutique, plutôt que d'être silencieusement laissé passer.
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
      router.replace("/catalogue");
      return;
    }

    if (profile === null) {
      router.replace("/onboarding");
      return;
    }

    if (isUnauthorizedRole) {
      router.replace("/erreur?code=403");
    }
  }, [loading, firebaseUser, profile, isUnauthorizedRole, router]);

  if (loading || !firebaseUser || profile === null || isUnauthorizedRole) {
    return null;
  }

  return <>{children}</>;
}

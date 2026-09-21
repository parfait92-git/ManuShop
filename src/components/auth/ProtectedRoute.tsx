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
 */
export function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { firebaseUser, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!firebaseUser) {
      router.replace("/login");
      return;
    }

    if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
      router.replace("/dashboard");
    }
  }, [loading, firebaseUser, profile, allowedRoles, router]);

  if (loading || !firebaseUser) {
    return null;
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return null;
  }

  return <>{children}</>;
}

"use client";

import type { User as FirebaseUser } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { toast } from "sonner";

import { auth, db } from "@/lib/firebase";
import {
  createLocalSessionId,
  getLocalSessionId,
} from "@/lib/sessionId";
import { authService } from "@/services/AuthService";
import { platformAdminService } from "@/services/PlatformAdminService";
import type { User } from "@/models/user/User";

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  profile: User | null;
  /** Appartenance à `platformAdmins` (Module 12, BF-67) — jamais un rôle sur
   * `profile`. Voir SuperAdminRoute. */
  isSuperAdmin: boolean;
  loading: boolean;
  /** Recharge le profil Firestore de l'utilisateur courant. Nécessaire
   * après une création de profil (inscription, onboarding) : `profile` ne
   * se met sinon à jour qu'au prochain événement `onAuthStateChanged`
   * (connexion/déconnexion), pas quand le document Firestore est créé
   * pendant une session déjà active — sans ça, `ProtectedRoute` continue de
   * voir `profile === null` et renvoie indéfiniment vers `/onboarding`. */
  refreshProfile: () => Promise<void>;
  /** BF-129 : ajoute/retire un produit des favoris du compte connecté — mis
   * à jour localement tout de suite (`profile.favoriteProductIds`), pas
   * seulement après confirmation Firestore, pour que le cœur réagisse au
   * clic sans attendre un aller-retour réseau ; annulé + toast d'erreur en
   * cas d'échec. Rien ne se passe si personne n'est connecté (appelant
   * responsable d'inviter à se connecter avant). */
  toggleFavorite: (productId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [localSessionId, setLocalSessionId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged(async (user) => {
      setFirebaseUser(user);

      if (!user) {
        setProfile(null);
        setIsSuperAdmin(false);
        setLoading(false);
        setLocalSessionId(null);
        return;
      }

      const [userProfile, superAdmin] = await Promise.all([
        authService.getUserProfile(user.uid),
        platformAdminService.isSuperAdmin(user.email),
      ]);
      setProfile(userProfile);
      setIsSuperAdmin(superAdmin);
      setLoading(false);

      if (userProfile) {
        // Session unique (un seul navigateur/appareil à la fois) : un id
        // déjà stocké localement (rechargement de page, ou autre onglet de
        // ce même navigateur) reste tel quel — seule une vraie première
        // connexion sur un navigateur qui n'a encore aucun id local en mine
        // un nouveau, qui écrase celui de Firestore et invalide toute autre
        // session active ailleurs (voir l'écouteur ci-dessous).
        const existing = getLocalSessionId();
        const sessionId = existing ?? createLocalSessionId();
        setLocalSessionId(sessionId);
        if (!existing) {
          await authService
            .updateProfile(user.uid, { activeSessionId: sessionId })
            .catch(() => {});
        }
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!firebaseUser || !localSessionId) return;

    const unsubscribe = onSnapshot(
      doc(db, "users", firebaseUser.uid),
      (snapshot) => {
        const remoteSessionId = snapshot.data()?.activeSessionId;
        if (remoteSessionId && remoteSessionId !== localSessionId) {
          authService.logout();
          toast.error(
            "Vous avez été déconnecté(e) : votre compte a été utilisé sur un autre appareil."
          );
        }
      }
    );

    return unsubscribe;
  }, [firebaseUser, localSessionId]);

  const refreshProfile = useCallback(async () => {
    // `auth.currentUser`, pas le `firebaseUser` du state React : ce dernier
    // ne se met à jour qu'après le callback `onAuthStateChanged`, qui peut
    // ne pas encore avoir tourné juste après une création de compte.
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const userProfile = await authService.getUserProfile(uid);
    setProfile(userProfile);
  }, []);

  const toggleFavorite = useCallback(
    async (productId: string) => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      const wasFavorite = profile?.favoriteProductIds?.includes(productId) ?? false;

      setProfile((current) =>
        current
          ? {
              ...current,
              favoriteProductIds: wasFavorite
                ? (current.favoriteProductIds ?? []).filter((id) => id !== productId)
                : [...(current.favoriteProductIds ?? []), productId],
            }
          : current
      );

      try {
        if (wasFavorite) {
          await authService.removeFavorite(uid, productId);
        } else {
          await authService.addFavorite(uid, productId);
        }
      } catch {
        setProfile((current) =>
          current
            ? {
                ...current,
                favoriteProductIds: wasFavorite
                  ? [...(current.favoriteProductIds ?? []), productId]
                  : (current.favoriteProductIds ?? []).filter((id) => id !== productId),
              }
            : current
        );
        toast.error("Échec de la mise à jour des favoris. Réessayez.");
      }
    },
    [profile]
  );

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        isSuperAdmin,
        loading,
        refreshProfile,
        toggleFavorite,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit être utilisé à l'intérieur d'un AuthProvider.");
  }
  return context;
}

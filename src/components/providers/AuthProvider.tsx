"use client";

import type { User as FirebaseUser } from "firebase/auth";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { auth } from "@/lib/firebase";
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
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged(async (user) => {
      setFirebaseUser(user);

      if (!user) {
        setProfile(null);
        setIsSuperAdmin(false);
        setLoading(false);
        return;
      }

      const [userProfile, superAdmin] = await Promise.all([
        authService.getUserProfile(user.uid),
        platformAdminService.isSuperAdmin(user.email),
      ]);
      setProfile(userProfile);
      setIsSuperAdmin(superAdmin);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const refreshProfile = useCallback(async () => {
    // `auth.currentUser`, pas le `firebaseUser` du state React : ce dernier
    // ne se met à jour qu'après le callback `onAuthStateChanged`, qui peut
    // ne pas encore avoir tourné juste après une création de compte.
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const userProfile = await authService.getUserProfile(uid);
    setProfile(userProfile);
  }, []);

  return (
    <AuthContext.Provider
      value={{ firebaseUser, profile, isSuperAdmin, loading, refreshProfile }}
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

import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  FacebookAuthProvider,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut,
  type ConfirmationResult,
  type RecaptchaVerifier,
  type User as FirebaseUser,
} from "firebase/auth";

import { auth, getSecondaryAuth } from "@/lib/firebase";
import type { User } from "@/models/user/User";
import { shopRepository } from "@/repositories/ShopRepository";
import type { IShopRepository } from "@/repositories/interfaces/IShopRepository";
import type { IUserRepository } from "@/repositories/interfaces/IUserRepository";
import { userRepository } from "@/repositories/UserRepository";

export interface RegisterShopOwnerInput {
  displayName: string;
  email: string;
  password: string;
}

export interface CompleteMerchantSignupInput {
  displayName: string;
}

export interface InviteSellerInput {
  displayName: string;
  email: string;
  shopId: string;
}

/** Random password satisfying Firebase's minimum length; the seller never
 * sees it — they set their own via the password-reset email sent right
 * after account creation. */
function generateTemporaryPassword(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}

export class AuthService {
  constructor(
    private readonly users: IUserRepository = userRepository,
    private readonly shops: IShopRepository = shopRepository
  ) {}

  /**
   * Inscrit un nouveau compte — toujours `role: 'client'` (Module 12 :
   * l'inscription ne donne plus jamais le rôle admin directement). Devenir
   * admin d'une boutique passe désormais soit par une attribution manuelle
   * du Super Admin, soit par un abonnement confirmé — voir
   * `docs/02-besoins-fonctionnels.md` Module 12 (BF-67, BF-68).
   */
  async registerShopOwner({
    displayName,
    email,
    password,
  }: RegisterShopOwnerInput): Promise<User> {
    const credential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    return this.createClientProfile(credential.user.uid, {
      displayName,
      email,
    });
  }

  /**
   * Termine la création du profil pour l'utilisateur Firebase déjà connecté
   * (après Google/Facebook/téléphone/anonyme, qui n'ont pas de nom à
   * proposer au moment de l'authentification). Toujours `role: 'client'`,
   * voir `registerShopOwner`. Voir `/onboarding`.
   */
  async completeMerchantSignup({
    displayName,
  }: CompleteMerchantSignupInput): Promise<User> {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      throw new Error(
        "Vous devez être connecté pour terminer la création de votre compte."
      );
    }

    return this.createClientProfile(firebaseUser.uid, {
      displayName,
      email: firebaseUser.email ?? undefined,
      phone: firebaseUser.phoneNumber ?? undefined,
      photoURL: firebaseUser.photoURL ?? undefined,
    });
  }

  /**
   * Crée le profil Firestore d'un utilisateur Firebase Auth déjà créé, quel
   * que soit le mode de connexion — toujours `role: 'client'`.
   */
  private createClientProfile(
    uid: string,
    {
      displayName,
      email,
      phone,
      photoURL,
    }: {
      displayName: string;
      email?: string;
      phone?: string;
      photoURL?: string;
    }
  ): Promise<User> {
    return this.users.create(uid, {
      ...(email ? { email } : {}),
      ...(phone ? { phone } : {}),
      ...(photoURL ? { photoURL } : {}),
      displayName,
      role: "client",
    });
  }

  /**
   * Crée une boutique pour l'utilisateur actuellement connecté et la lui
   * associe (`shopId`). Réservé à un compte déjà `role: 'admin'` — les
   * règles Firestore rejettent la création sinon (Module 12). Appelé une
   * fois le rôle admin obtenu (attribution Super Admin ou abonnement), pas
   * à l'inscription.
   */
  async createShop(shopName: string): Promise<string> {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      throw new Error("Vous devez être connecté pour créer une boutique.");
    }

    const shop = await this.shops.create({
      name: shopName,
      logo: "",
      address: "",
      phone: "",
      whatsapp: "",
      currency: "XAF",
      ownerId: firebaseUser.uid,
    });

    await this.users.update(firebaseUser.uid, { shopId: shop.id });

    return shop.id;
  }

  /**
   * Crée un compte Vendeur pour la boutique de l'admin courant. Utilise une
   * instance Firebase secondaire pour que la création du compte (qui
   * connecte automatiquement le SDK client à ce nouvel utilisateur) ne
   * déconnecte pas l'admin de sa propre session. Le nouveau vendeur reçoit
   * un email de réinitialisation pour choisir son propre mot de passe.
   */
  async inviteSeller({
    displayName,
    email,
    shopId,
  }: InviteSellerInput): Promise<User> {
    const secondaryAuth = getSecondaryAuth();

    try {
      const credential = await createUserWithEmailAndPassword(
        secondaryAuth,
        email,
        generateTemporaryPassword()
      );

      const user = await this.users.create(credential.user.uid, {
        email,
        displayName,
        role: "seller",
        shopId,
      });

      await sendPasswordResetEmail(auth, email);

      return user;
    } finally {
      await signOut(secondaryAuth);
    }
  }

  listTeamMembers(shopId: string): Promise<User[]> {
    return this.users.listByShop(shopId);
  }

  /** Bascule la persistance de la session : "local" (survit à la fermeture
   * du navigateur, `Se souvenir de moi`) ou "session" (effacée à la
   * fermeture de l'onglet). Doit être appelé avant `login`/`loginWith*`. */
  async setRememberMe(remember: boolean): Promise<void> {
    await setPersistence(
      auth,
      remember ? browserLocalPersistence : browserSessionPersistence
    );
  }

  async login(email: string, password: string): Promise<FirebaseUser> {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return credential.user;
  }

  async loginWithGoogle(): Promise<FirebaseUser> {
    const credential = await signInWithPopup(auth, new GoogleAuthProvider());
    return credential.user;
  }

  async loginWithFacebook(): Promise<FirebaseUser> {
    const credential = await signInWithPopup(auth, new FacebookAuthProvider());
    return credential.user;
  }

  async loginAnonymously(): Promise<FirebaseUser> {
    const credential = await signInAnonymously(auth);
    return credential.user;
  }

  /** Envoie le code de vérification SMS. `verifier` est un RecaptchaVerifier
   * créé côté composant (nécessite le DOM). */
  startPhoneSignIn(
    phoneNumber: string,
    verifier: RecaptchaVerifier
  ): Promise<ConfirmationResult> {
    return signInWithPhoneNumber(auth, phoneNumber, verifier);
  }

  async confirmPhoneCode(
    confirmation: ConfirmationResult,
    code: string
  ): Promise<FirebaseUser> {
    const credential = await confirmation.confirm(code);
    return credential.user;
  }

  async logout(): Promise<void> {
    await signOut(auth);
  }

  async sendPasswordReset(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email);
  }

  onAuthStateChanged(callback: (user: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, callback);
  }

  getUserProfile(uid: string): Promise<User | null> {
    return this.users.getById(uid);
  }
}

export const authService = new AuthService();

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
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
  shopName: string;
  email: string;
  password: string;
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

  /** Inscrit le gérant (Admin) et crée sa boutique par défaut. */
  async registerShopOwner({
    displayName,
    shopName,
    email,
    password,
  }: RegisterShopOwnerInput): Promise<User> {
    const credential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    // Le profil utilisateur doit exister avant la boutique : les règles
    // Firestore vérifient le rôle admin via users/{uid} pour autoriser
    // l'écriture sur shops/{shopId}.
    const user = await this.users.create(credential.user.uid, {
      email,
      displayName,
      role: "admin",
    });

    const shop = await this.shops.create({
      name: shopName,
      logo: "",
      address: "",
      phone: "",
      whatsapp: "",
      currency: "XAF",
      ownerId: credential.user.uid,
    });

    await this.users.update(credential.user.uid, { shopId: shop.id });

    return { ...user, shopId: shop.id };
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

  async login(email: string, password: string): Promise<FirebaseUser> {
    const credential = await signInWithEmailAndPassword(auth, email, password);
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

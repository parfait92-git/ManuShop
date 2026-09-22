import type { Timestamp } from "firebase/firestore";
import type { UserRole } from "./UserRole";

/** Durées d'abonnement proposées pour devenir admin d'une boutique
 * (Module 12, BF-68). */
export type SubscriptionPlan =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly";

export interface User {
  id: string;
  // Optional: a user who signed up via téléphone or anonymement has no
  // email, and one who signed up via email/Google/Facebook has no phone.
  email?: string;
  role: UserRole;
  // Uniquement pertinent pour admin/seller (la boutique qu'ils gèrent) — un
  // client n'est jamais scopé à une boutique : il peut être client de
  // n'importe laquelle des boutiques publiées sur la plateforme (Module 12).
  shopId?: string;
  displayName: string;
  phone?: string;
  photoURL?: string;
  // Comment ce compte est devenu admin (Module 12, BF-68) — détermine si le
  // rôle expire tout seul ou reste tant que le Super Admin ne le retire pas
  // manuellement. Absent pour un compte qui n'a jamais été admin.
  adminSource?: "manual" | "subscription";
  // Renseignés uniquement quand `adminSource === "subscription"`. Un job
  // planifié côté serveur (pas encore construit, voir 04-besoins-techniques
  // §11.5) doit repasser `role` à `client` une fois `subscriptionExpiresAt`
  // dépassé.
  subscriptionPlan?: SubscriptionPlan;
  subscriptionExpiresAt?: Timestamp;
  createdAt: Timestamp;
}

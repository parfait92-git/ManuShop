import type { Timestamp } from "firebase/firestore";
import type { UserRole } from "./UserRole";

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
  // Comment ce compte a obtenu pour la première fois le droit de gérer des
  // boutiques — "manual" (attribution par le Super Admin, BF-68) ou
  // "subscription" (première boutique créée via l'assistant self-service,
  // BF-79→85). Purement informatif ici, sans notion d'expiration : depuis
  // le 2026-09-25, l'abonnement qui expire réellement est celui de CHAQUE
  // boutique (`Shop.adminSource`/`subscriptionPlan`/`subscriptionExpiresAt`),
  // pas du compte — un `role: 'admin'` ne redescend jamais tout seul (BF-93).
  adminSource?: "manual" | "subscription";
  createdAt: Timestamp;
}

import type { Timestamp } from "firebase/firestore";
import type { UserRole } from "./UserRole";

export interface User {
  id: string;
  // Optional: Google/Facebook n'exposent pas toujours l'email (permission
  // refusée côté Facebook, notamment) — traité comme un cas limite plutôt
  // que comme un flux d'auth à part entière.
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
  // Préférence personnelle (paramètres du compte). Absent traité comme
  // `true` (même convention que `Product.isPublished`) : un compte reçoit
  // les notifications par email sauf désactivation explicite. Aucun envoi
  // réel ne lit encore ce champ — voir 04-besoins-techniques.md pour la
  // notification de nouvelle version, pas encore construite (pas de
  // fournisseur d'email choisi).
  notifyByEmail?: boolean;
  createdAt: Timestamp;
}

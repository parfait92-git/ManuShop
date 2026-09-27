import type { Timestamp } from "firebase/firestore";

export type PrimarySocialNetwork =
  | "whatsapp"
  | "facebook"
  | "instagram"
  | "tiktok";

/** BF-105 : canaux que le commerçant choisit d'exposer aux CLIENTS pour le
 * contacter — distinct de `notifyOrdersByEmail`/`contactEmail`/
 * `urgentPhone` ci-dessous, qui concernent la façon dont LE COMMERÇANT est
 * prévenu d'une commande, pas la façon dont un client le contacte. Premium
 * (`advancedContact`, voir `lib/premiumFeatures.ts`). */
export type ClientContactMethod = "email" | "whatsapp" | "facebook" | "instagram";

/** Durées d'abonnement proposées pour créer/maintenir une boutique (Module
 * 15, BF-83). Vivait sur `User` jusqu'au 2026-09-25 — déplacé ici car un
 * abonnement finance une boutique précise, pas le compte entier (un
 * commerçant peut en posséder plusieurs, BF-85). */
export type SubscriptionPlan =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly";

export interface Shop {
  id: string;
  name: string;
  logo: string;
  /** Présentée sur la fiche produit (bloc vendeur, BF-128) et dans les
   * paramètres de boutique — absente des boutiques créées avant l'ajout de
   * ce champ. */
  description?: string;
  address: string;
  phone: string;
  whatsapp: string;
  currency: string;
  ownerId: string;
  /** Secteur d'activité (ex. "Mode", "Alimentation") — saisi à la création
   * de la boutique (BF-80). Absent des boutiques créées avant le 2026-09-25. */
  sector?: string;
  // Comment cette boutique a obtenu le droit d'être admin/publiable
  // (Module 15) — distinct de `User.adminSource`, qui documente comment le
  // COMPTE a obtenu le droit de gérer des boutiques (attribution manuelle du
  // Super Admin, BF-68). Une boutique créée via l'assistant self-service
  // (BF-79→85) a toujours `adminSource: "subscription"` ici.
  adminSource?: "manual" | "subscription";
  // Renseignés uniquement quand `adminSource === "subscription"`. Un job
  // planifié côté serveur (pas encore construit, voir 04-besoins-techniques
  // §11.5/§12.1) doit dépublier la boutique une fois `subscriptionExpiresAt`
  // dépassé (BF-93 : restriction par boutique, pas de rétrogradation du compte).
  subscriptionPlan?: SubscriptionPlan;
  subscriptionExpiresAt?: Timestamp;
  // Paramètres avancés (optionnels : les boutiques créées avant l'ajout de
  // la page "Paramètres" n'ont pas encore ces champs en Firestore).
  language?: string;
  primarySocialNetwork?: PrimarySocialNetwork;
  notifyOrdersByEmail?: boolean;
  notifyOrdersBySocial?: boolean;
  urgentPhoneAlerts?: boolean;
  contactEmail?: string;
  urgentPhone?: string;
  // Plateforme multi-boutique (Module 12). Optionnels : absents tant que la
  // bascule "Publier ma boutique" (BF-62) n'est pas construite — une
  // boutique sans `isPublished` est traitée comme non publiée (`?? false`).
  isPublished?: boolean;
  /** Identifiant opaque utilisé dans l'URL publique de la boutique (BF-64),
   * jamais l'id Firestore brut. Schéma d'encodage à confirmer — voir
   * docs/04-besoins-techniques.md §11.3. */
  publicToken?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  whatsappBusinessUrl?: string;
  /** BF-105 : réutilise `whatsapp`/`facebookUrl`/`instagramUrl` ci-dessus
   * pour les canaux correspondants — seul l'email a besoin d'un champ dédié
   * (`contactEmail` ci-dessus a un usage distinct, interne, voir sa
   * documentation). */
  clientContactMethods?: ClientContactMethod[];
  publicContactEmail?: string;
  /** BF-119 : privilèges premium activés pour CETTE boutique précise,
   * indépendamment de l'état de son abonnement — clés de
   * `lib/premiumFeatures.ts`, activées/désactivées exclusivement par le
   * Super Admin (Server Action, voir `platformAdminActions.ts`). */
  premiumFeatures?: string[];
  createdAt: Timestamp;
}

import type { Timestamp } from "firebase/firestore";

export type PrimarySocialNetwork =
  | "whatsapp"
  | "facebook"
  | "instagram"
  | "tiktok";

export interface Shop {
  id: string;
  name: string;
  logo: string;
  address: string;
  phone: string;
  whatsapp: string;
  currency: string;
  ownerId: string;
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
  createdAt: Timestamp;
}

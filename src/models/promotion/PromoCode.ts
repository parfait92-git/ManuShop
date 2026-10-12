import type { Timestamp } from "firebase/firestore";

import type { PromotionKind } from "./Promotion";

/**
 * Code promo d'une boutique (BF-32, 2026-10-12) : une réduction sur le
 * montant de la commande, que le client saisit au moment de commander.
 * Écrit par le serveur seulement ; lu par le seul gérant (le client ne voit
 * que le code qu'il a saisi, vérifié par le serveur).
 *
 * Identifiant `<shopId>_<CODE>` : un code est unique dans sa boutique et
 * ne change plus après sa création.
 */
export interface PromoCode {
  id: string;
  shopId: string;
  /** En majuscules, lettres, chiffres et tirets (« RENTREE10 »). */
  code: string;
  /** Pourcentage (1 à 90) ou montant en FCFA retiré de la commande. */
  kind: PromotionKind;
  value: number;
  /** Montant minimum de la commande (articles), 0 : aucun. */
  minSubtotal: number;
  /** Nombre total d'utilisations, `null` : illimité. */
  maxUses: number | null;
  /** Utilisations par client, `null` : illimité. */
  perClient: number | null;
  startsAt: Timestamp;
  endsAt: Timestamp;
  /** Commandes passées avec le code (une commande annulée le libère). */
  usedCount: number;
  createdAt: Timestamp;
}

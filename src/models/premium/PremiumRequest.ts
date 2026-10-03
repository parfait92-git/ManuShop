import type { Timestamp } from "firebase/firestore";

/**
 * Demande d'achat d'un article premium (2026-10-03), collection
 * `premiumRequests`. Pas encore de paiement en ligne : le commerçant
 * demande, le Super Admin encaisse hors plateforme puis valide — l'article
 * est alors ajouté définitivement aux privilèges de la boutique.
 */
export type PremiumRequestStatus = "pending" | "approved" | "rejected";

export interface PremiumRequest {
  id: string;
  shopId: string;
  shopName: string;
  itemKey: string;
  itemLabel: string;
  /** Prix affiché au moment de la demande. */
  priceFcfa: number;
  status: PremiumRequestStatus;
  requestedBy: string;
  requestedByName: string;
  createdAt: Timestamp;
  decidedAt?: Timestamp;
}

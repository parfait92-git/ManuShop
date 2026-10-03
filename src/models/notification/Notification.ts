import type { Timestamp } from "firebase/firestore";

/**
 * Notification dans l'application (2026-10-02) — collection
 * `notifications`, créée uniquement par le serveur (`firebase-admin`) ; le
 * destinataire peut seulement la lire et la marquer comme lue
 * (firestore.rules). Affichée dans la cloche de la vitrine.
 */
export type NotificationType =
  /** Commande livrée : invitation à donner son avis. */
  | "review_request"
  /** Le commerçant a répondu à un avis du client. */
  | "review_reply";

export interface AppNotification {
  id: string;
  /** Destinataire (uid). */
  userId: string;
  type: NotificationType;
  orderId: string;
  shopId: string;
  /** Texte affiché, déjà rédigé au moment de l'envoi. */
  message: string;
  /** Page ouverte au clic, ex. `/mes-commandes/{orderId}/avis`. */
  link: string;
  read: boolean;
  createdAt: Timestamp;
}

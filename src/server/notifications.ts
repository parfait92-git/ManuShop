import "server-only";

import { FieldValue, type Firestore, type WriteBatch } from "firebase-admin/firestore";

import type { NotificationType } from "@/models/notification/Notification";

/** Collection des notifications dans l'application (voir
 * `AppNotification`) — écrites uniquement ici, côté serveur. */
export const NOTIFICATIONS_COLLECTION = "notifications";

export function feedbackPath(orderId: string): string {
  return `/mes-commandes/${orderId}/avis`;
}

/**
 * Ajoute une notification au lot d'écritures `batch` — elle n'existe donc
 * que si le reste du lot (changement de statut, réponse...) est bien écrit.
 */
export function queueNotification(
  db: Firestore,
  batch: WriteBatch,
  input: {
    userId: string;
    type: NotificationType;
    orderId: string;
    shopId: string;
    message: string;
  }
): void {
  batch.set(db.collection(NOTIFICATIONS_COLLECTION).doc(), {
    ...input,
    link: feedbackPath(input.orderId),
    read: false,
    createdAt: FieldValue.serverTimestamp(),
  });
}

import { doc, updateDoc } from "firebase/firestore";

import { db } from "@/lib/firebase";

const NOTIFICATIONS_COLLECTION = "notifications";

/**
 * Notifications dans l'application (2026-10-02) — créées par le serveur
 * (`src/server/notifications.ts`) ; le destinataire peut seulement les
 * marquer comme lues (voir `firestore.rules`). La liste en temps réel est
 * dans `useNotifications`.
 */
export class NotificationService {
  markRead(notificationId: string): Promise<void> {
    return updateDoc(doc(db, NOTIFICATIONS_COLLECTION, notificationId), { read: true });
  }
}

export const notificationService = new NotificationService();

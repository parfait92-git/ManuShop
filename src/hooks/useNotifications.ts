"use client";

import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";

import { db } from "@/lib/firebase";
import type { AppNotification } from "@/models/notification/Notification";

const NOTIFICATIONS_COLLECTION = "notifications";
/** La cloche n'affiche que les plus récentes. */
const MAX_SHOWN = 20;

/**
 * Notifications de l'utilisateur connecté, en temps réel (cloche de la
 * vitrine, 2026-10-02). Pas de `orderBy` côté requête (évite un index
 * composite, comme `useSupportMessagesForShop`) : tri fait ici.
 */
export function useNotifications(userId: string | undefined): AppNotification[] {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (!userId) {
      queueMicrotask(() => setNotifications([]));
      return;
    }

    return onSnapshot(
      query(collection(db, NOTIFICATIONS_COLLECTION), where("userId", "==", userId)),
      (snapshot) => {
        const data = snapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as AppNotification
        );
        data.sort(
          (a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)
        );
        setNotifications(data.slice(0, MAX_SHOWN));
      },
      () => setNotifications([])
    );
  }, [userId]);

  return notifications;
}

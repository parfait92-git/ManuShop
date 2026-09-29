"use client";

import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { useEffect } from "react";

import { db } from "@/lib/firebase";
import { playNotificationSound } from "@/lib/notificationSound";
import type { Order } from "@/models/order/Order";
import type { OrderStatus } from "@/models/order/OrderStatus";
import type { Shop } from "@/models/shop/Shop";
import type { SupportMessage } from "@/models/support/SupportMessage";

/**
 * Bips de notification dans le dashboard marchand (demande explicite de
 * l'utilisateur, 2026-09-28) : nouvelle commande, changement de statut de
 * commande, réponse du Super Admin à un message — chacun indépendamment
 * désactivable (`ShopSettingsForm`, `Shop.soundOnNewOrder`/
 * `soundOnOrderStatusChange`/`soundOnNewMessage`). Monté une seule fois au
 * niveau du layout dashboard (`DashboardNotificationSounds`), pas par page,
 * pour jouer quel que soit l'écran consulté.
 *
 * Les préférences sont lues via leur propre `onSnapshot` (pas une prop
 * figée au montage) : sans ça, activer/désactiver un son depuis les
 * paramètres ne prendrait effet qu'après un rechargement complet, le layout
 * dashboard restant monté d'une page à l'autre.
 *
 * Trois abonnements indépendants plutôt qu'une lecture ponctuelle : chacun
 * ignore délibérément son tout premier instantané (données déjà
 * existantes au montage) pour ne jamais biper sur l'historique, seulement
 * sur ce qui change réellement après. Correct pour le volume actuel de
 * commandes/messages par boutique ; à revoir (curseur, pagination) si une
 * boutique en accumule énormément un jour.
 */
export function useDashboardNotificationSounds(shopId: string | undefined) {
  useEffect(() => {
    if (!shopId) return;

    let soundOnNewOrder = true;
    let soundOnOrderStatusChange = true;
    let soundOnNewMessage = true;

    const unsubscribePrefs = onSnapshot(doc(db, "shops", shopId), (snap) => {
      const data = snap.data() as Shop | undefined;
      soundOnNewOrder = data?.soundOnNewOrder ?? true;
      soundOnOrderStatusChange = data?.soundOnOrderStatusChange ?? true;
      soundOnNewMessage = data?.soundOnNewMessage ?? true;
    });

    const knownStatuses = new Map<string, OrderStatus>();
    let isFirstOrdersSnapshot = true;

    const unsubscribeOrders = onSnapshot(
      query(collection(db, "orders"), where("shopId", "==", shopId)),
      (snapshot) => {
        if (isFirstOrdersSnapshot) {
          isFirstOrdersSnapshot = false;
          for (const change of snapshot.docChanges()) {
            const order = change.doc.data() as Order;
            knownStatuses.set(change.doc.id, order.status);
          }
          return;
        }
        for (const change of snapshot.docChanges()) {
          const order = change.doc.data() as Order;
          if (change.type === "added") {
            knownStatuses.set(change.doc.id, order.status);
            if (soundOnNewOrder) playNotificationSound("order");
          } else if (change.type === "modified") {
            const previousStatus = knownStatuses.get(change.doc.id);
            knownStatuses.set(change.doc.id, order.status);
            if (
              previousStatus !== undefined &&
              previousStatus !== order.status &&
              soundOnOrderStatusChange
            ) {
              playNotificationSound("orderStatus");
            }
          }
        }
      }
    );

    const knownReplies = new Set<string>();
    let isFirstMessagesSnapshot = true;

    const unsubscribeMessages = onSnapshot(
      query(collection(db, "supportMessages"), where("shopId", "==", shopId)),
      (snapshot) => {
        if (isFirstMessagesSnapshot) {
          isFirstMessagesSnapshot = false;
          for (const change of snapshot.docChanges()) {
            const message = change.doc.data() as SupportMessage;
            if (message.reply) knownReplies.add(change.doc.id);
          }
          return;
        }
        for (const change of snapshot.docChanges()) {
          if (change.type === "removed") {
            knownReplies.delete(change.doc.id);
            continue;
          }
          const message = change.doc.data() as SupportMessage;
          const hadReply = knownReplies.has(change.doc.id);
          if (message.reply && !hadReply) {
            knownReplies.add(change.doc.id);
            if (soundOnNewMessage) playNotificationSound("message");
          } else if (!message.reply) {
            knownReplies.delete(change.doc.id);
          }
        }
      }
    );

    return () => {
      unsubscribePrefs();
      unsubscribeOrders();
      unsubscribeMessages();
    };
  }, [shopId]);
}

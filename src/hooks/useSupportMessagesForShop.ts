"use client";

import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";

import { db } from "@/lib/firebase";
import type { SupportMessage } from "@/models/support/SupportMessage";

const SUPPORT_MESSAGES_COLLECTION = "supportMessages";

/**
 * Messages du commerçant en temps réel (`/dashboard/support`) — contrairement
 * au Super Admin (`useNewSupportMessagesCount`, sondage périodique), un
 * `onSnapshot` direct est possible ici : `firestore.rules` accorde déjà au
 * commerçant la lecture des messages de sa propre boutique. Signalé par
 * l'utilisateur : la réponse du Super Admin n'apparaissait qu'après
 * rechargement de la page.
 *
 * Pas de `orderBy` côté requête (même contrainte que
 * `SupportMessageRepository.listForShop`, évite un index composite) — tri
 * fait ici, à chaque snapshot.
 */
export function useSupportMessagesForShop(
  shopId: string | undefined
): SupportMessage[] | undefined {
  const [messages, setMessages] = useState<SupportMessage[] | undefined>(
    undefined
  );

  useEffect(() => {
    if (!shopId) {
      queueMicrotask(() => setMessages(undefined));
      return;
    }

    const unsubscribe = onSnapshot(
      query(
        collection(db, SUPPORT_MESSAGES_COLLECTION),
        where("shopId", "==", shopId)
      ),
      (snapshot) => {
        const data = snapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as SupportMessage
        );
        data.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
        setMessages(data);
      },
      () => setMessages([])
    );

    return unsubscribe;
  }, [shopId]);

  return messages;
}

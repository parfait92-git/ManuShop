"use client";

import { useEffect, useState } from "react";

import { supportMessageService } from "@/services/SupportMessageService";

const POLL_INTERVAL_MS = 60_000;

/**
 * Alimente le badge "Messages" de `SuperAdminSidebar` — un `onSnapshot`
 * direct n'est pas possible ici (contrairement à `useNewOrdersCount`) :
 * `supportMessages` n'accorde de lecture côté client qu'au commerçant
 * propriétaire de la boutique concernée (voir `firestore.rules`), jamais au
 * Super Admin (délibérément non exprimé par une règle, voir
 * `listSupportMessagesAction`). Repli sur un sondage périodique via la
 * Server Action dédiée (`countOpenSupportMessagesAction`), qui contourne
 * les règles comme le reste des lectures Super Admin.
 */
export function useNewSupportMessagesCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;

    function refresh() {
      supportMessageService
        .countOpenMessages()
        .then((value) => {
          if (active) setCount(value);
        })
        .catch(() => {});
    }

    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return count;
}

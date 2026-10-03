"use client";

import { useSyncExternalStore } from "react";

import { formatDateTime } from "@/lib/dateTime";

const subscribe = () => () => {};

/**
 * Date et heure dans le fuseau horaire de l'appareil du lecteur
 * (2026-10-03). La page est rendue par le serveur, qui tourne en UTC :
 * le premier rendu affiche l'heure du Cameroun, puis le navigateur la
 * remplace par son heure locale.
 */
export function LocalDateTime({ iso }: { iso: string }) {
  const date = new Date(iso);
  const text = useSyncExternalStore(
    subscribe,
    () => formatDateTime(date, "long"),
    () => formatDateTime(date, "long", "Africa/Douala")
  );
  return <time dateTime={iso}>{text}</time>;
}

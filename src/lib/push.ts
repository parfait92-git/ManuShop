"use client";

/**
 * Notifications push côté navigateur (2026-10-04) : Firebase Cloud
 * Messaging, sur le service worker de l'application (`public/sw.js`), qui
 * affiche lui-même les notifications. `firebase/messaging` n'est chargé
 * qu'à la demande.
 */
import { firebaseApp } from "@/lib/firebase";

export const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? "";

/** Mémorise, sur cet appareil, le jeton inscrit (pour le désinscrire). */
const TOKEN_KEY = "manushop:push-token";

export type PushAvailability =
  /** Navigateur sans notifications push. */
  | "unsupported"
  /** iPhone/iPad : seulement une fois l'application installée. */
  | "install-required"
  /** Clé Web Push absente de la configuration. */
  | "not-configured"
  | "available";

function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalone(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export async function pushAvailability(): Promise<PushAvailability> {
  if (typeof window === "undefined") return "unsupported";
  if (isIos() && !isStandalone()) return "install-required";
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";
  const { isSupported } = await import("firebase/messaging");
  if (!(await isSupported().catch(() => false))) return "unsupported";
  if (!VAPID_KEY) return "not-configured";
  return "available";
}

export function storedPushToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Demande l'autorisation (geste de l'utilisateur requis) puis le jeton de
 * cet appareil. `null` si l'autorisation est refusée.
 */
export async function requestPushToken(): Promise<string | null> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;
  const registration = await navigator.serviceWorker.ready;
  const { getMessaging, getToken } = await import("firebase/messaging");
  const token = await getToken(getMessaging(firebaseApp), { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {}
  return token;
}

/** Oublie le jeton de cet appareil (côté Firebase et localement). */
export async function releasePushToken(): Promise<void> {
  try {
    const { deleteToken, getMessaging } = await import("firebase/messaging");
    await deleteToken(getMessaging(firebaseApp));
  } catch {
    // Jeton déjà invalide : rien à faire.
  }
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

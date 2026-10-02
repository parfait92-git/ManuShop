const SEEN_TOURS_KEY = "manushop:seen-tours";

/** Mémoire "visite déjà vue" d'un visiteur non connecté (vitrine, pages
 * d'auth) — un compte connecté utilise `User.seenTours` (Firestore), qui le
 * suit d'un appareil à l'autre. Peut être indisponible (navigation privée) :
 * on échoue silencieusement, comme `productDraft.ts` — au pire la visite
 * se relance à la prochaine visite. */
export function guestSeenTours(): string[] {
  try {
    const raw = window.localStorage.getItem(SEEN_TOURS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function markGuestTourSeen(tourId: string): void {
  try {
    const seen = guestSeenTours();
    if (seen.includes(tourId)) return;
    window.localStorage.setItem(SEEN_TOURS_KEY, JSON.stringify([...seen, tourId]));
  } catch {
    // Ignoré : la mémoire "déjà vu" est un confort, pas une garantie.
  }
}

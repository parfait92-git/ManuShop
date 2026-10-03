/**
 * Dates affichées avec leur heure (2026-10-03, demande de l'utilisateur) :
 * « 3 oct. 2026 à 21:40 » (`short`) ou « 3 octobre 2026 à 21:40 » (`long`),
 * dans le fuseau horaire de l'appareil de l'utilisateur — ou dans
 * `timeZone` si on le précise (le serveur, qui génère une facture, reçoit
 * celui du navigateur). Date et heure formatées à part : le séparateur
 * d'`Intl` varie selon le navigateur (« , » ou « à »).
 */
export function formatDateTime(
  date: Date,
  style: "short" | "long" = "short",
  timeZone?: string
): string {
  const zone = timeZone ? { timeZone } : {};
  const day = date.toLocaleDateString("fr-FR", { day: "numeric", month: style, year: "numeric", ...zone });
  const time = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", ...zone });
  return `${day} à ${time}`;
}

/** Fuseau horaire IANA reconnu (« Europe/Paris »), sinon `undefined`. */
export function validTimeZone(value: unknown): string | undefined {
  if (typeof value !== "string" || !value || value.length > 64) return undefined;
  try {
    new Intl.DateTimeFormat("fr-FR", { timeZone: value });
    return value;
  } catch {
    return undefined;
  }
}

/** Fuseau horaire de l'appareil (navigateur). */
export function deviceTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

/**
 * Dates affichées avec leur heure (2026-10-03, demande de l'utilisateur),
 * à l'heure du Cameroun quel que soit le fuseau de l'appareil :
 * « 3 oct. 2026 à 21:40 » (`short`) ou « 3 octobre 2026 à 21:40 » (`long`).
 * Date et heure formatées à part : le séparateur d'`Intl` varie selon le
 * navigateur (« , » ou « à »).
 */
const TIME_ZONE = "Africa/Douala";

export function formatDateTime(date: Date, style: "short" | "long" = "short"): string {
  const day = date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: style,
    year: "numeric",
    timeZone: TIME_ZONE,
  });
  const time = date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIME_ZONE,
  });
  return `${day} à ${time}`;
}

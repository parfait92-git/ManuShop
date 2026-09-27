import type { Timestamp } from "firebase/firestore";

/**
 * "Depuis X" affiché sur la fiche produit (bloc vendeur, BF-128) — calcule
 * en mois pleins depuis `createdAt` plutôt qu'une simple date, pour rester
 * lisible sans obliger le client à faire le calcul lui-même.
 */
export function formatShopAge(createdAt: Timestamp, now: Date = new Date()): string {
  const created = createdAt.toDate();

  let months =
    (now.getFullYear() - created.getFullYear()) * 12 +
    (now.getMonth() - created.getMonth());
  if (now.getDate() < created.getDate()) {
    months -= 1;
  }

  if (months <= 0) return "Depuis moins d'un mois";
  if (months < 12) return `Depuis ${months} mois`;

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  const yearsLabel = `${years} an${years > 1 ? "s" : ""}`;

  return remainingMonths === 0
    ? `Depuis ${yearsLabel}`
    : `Depuis ${yearsLabel} et ${remainingMonths} mois`;
}

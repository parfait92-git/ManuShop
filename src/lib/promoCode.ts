import { applyDiscount } from "@/lib/pricing";
import type { PromotionKind } from "@/models/promotion/Promotion";

/**
 * Règles des codes promo (BF-32, 2026-10-12), communes à la page de
 * commande (aperçu) et au serveur (seul juge, au moment de la commande).
 * Le code s'applique au montant des articles, prix des campagnes déjà
 * compris : il s'ajoute à une promotion automatique.
 */
export interface PromoCodeRules {
  code: string;
  kind: PromotionKind;
  value: number;
  minSubtotal: number;
  maxUses: number | null;
  perClient: number | null;
  startsAt: { toMillis(): number };
  endsAt: { toMillis(): number };
  usedCount: number;
}

export const CODE_PATTERN = /^[A-Z0-9-]{3,20}$/;

/** « rentrée 10 » → « RENTREE10 » : majuscules, sans accents ni espaces. */
export function normalizeCode(raw: string): string {
  return String(raw ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "")
    .toUpperCase();
}

/** Réduction accordée sur un montant d'articles (jamais au-delà). */
export function codeDiscount(code: Pick<PromoCodeRules, "kind" | "value">, subtotal: number): number {
  return Math.min(subtotal, subtotal - applyDiscount(subtotal, code.kind, code.value));
}

const fcfa = (n: number) => `${n.toLocaleString("fr-FR")} FCFA`;

/**
 * Pourquoi le code ne s'applique pas à cette commande, `null` s'il
 * s'applique. `clientUses` : commandes déjà passées par ce client avec ce code.
 */
export function codeProblem(
  code: PromoCodeRules,
  { subtotal, now, clientUses }: { subtotal: number; now: number; clientUses: number },
): string | null {
  if (code.startsAt.toMillis() > now) return `Le code ${code.code} n'est pas encore valable.`;
  if (code.endsAt.toMillis() <= now) return `Le code ${code.code} a expiré.`;
  if (code.maxUses !== null && code.usedCount >= code.maxUses) return `Le code ${code.code} a atteint son nombre d'utilisations.`;
  if (code.perClient !== null && clientUses >= code.perClient) {
    return code.perClient === 1
      ? `Vous avez déjà utilisé le code ${code.code}.`
      : `Vous avez déjà utilisé le code ${code.code} ${code.perClient} fois.`;
  }
  if (subtotal < code.minSubtotal) return `Le code ${code.code} demande ${fcfa(code.minSubtotal)} d'achats au moins.`;
  return null;
}

/** « −10 % » ou « −2 000 FCFA ». */
export function codeValueLabel(code: Pick<PromoCodeRules, "kind" | "value">): string {
  return code.kind === "percent" ? `−${code.value} %` : `−${fcfa(code.value)}`;
}

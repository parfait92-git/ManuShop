"use server";

import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebaseAdmin";
import { CODE_PATTERN, codeDiscount, codeProblem, normalizeCode, type PromoCodeRules } from "@/lib/promoCode";
import type { PromotionKind } from "@/models/promotion/Promotion";
import { requireCaller } from "@/server/auth/requireCaller";
import { NotFoundError, ValidationError } from "@/server/errors";
import { checkDiscount, parseInstant, requireManager } from "@/server/promotions/common";
import { PROMO_CODE_USES, PROMO_CODES_COLLECTION, promoCodeRef } from "@/server/promotions/promoCodes";

const MAX_DURATION_MS = 366 * 24 * 3600 * 1000;
const MAX_LIMIT = 1_000_000;

export interface PromoCodeInput {
  /** Code existant à modifier ; absent : nouveau code. */
  id?: string;
  /** Ignoré en modification : un code ne change plus après sa création. */
  code: string;
  kind: PromotionKind;
  value: number;
  minSubtotal: number;
  maxUses: number | null;
  perClient: number | null;
  /** Instants ISO (saisis à l'heure de l'appareil du gérant). */
  startsAt: string;
  endsAt: string;
}

function checkLimit(raw: number | null, label: string): number | null {
  if (raw === null || raw === undefined) return null;
  const n = Number(raw);
  if (!(Number.isInteger(n) && n >= 1 && n <= MAX_LIMIT)) throw new ValidationError(`${label} : un nombre entier d'au moins 1.`);
  return n;
}

/**
 * Crée ou modifie un code promo (BF-32, 2026-10-12). Un code terminé ne
 * se modifie plus (il sert d'historique) ; la limite totale ne descend pas
 * sous le nombre d'utilisations déjà faites.
 */
export async function savePromoCodeAction(idToken: string, input: PromoCodeInput): Promise<{ id: string }> {
  const db = getAdminDb();
  const { shopId } = await requireManager(db, idToken);

  const value = checkDiscount(input.kind, input.value);
  const minSubtotal = Number(input.minSubtotal ?? 0);
  if (!(Number.isInteger(minSubtotal) && minSubtotal >= 0 && minSubtotal <= 100_000_000)) {
    throw new ValidationError("Le montant minimum doit être un nombre entier de FCFA.");
  }
  if (input.kind === "amount" && minSubtotal > 0 && value > minSubtotal) {
    throw new ValidationError("La réduction dépasse le montant minimum de la commande.");
  }
  const maxUses = checkLimit(input.maxUses, "Nombre d'utilisations");
  const perClient = checkLimit(input.perClient, "Utilisations par client");
  const startsAt = parseInstant(input.startsAt, "début");
  const endsAt = parseInstant(input.endsAt, "fin");
  const now = Date.now();
  if (endsAt.getTime() <= startsAt.getTime()) throw new ValidationError("La fin doit venir après le début.");
  if (endsAt.getTime() <= now) throw new ValidationError("La date de fin est déjà passée.");
  if (endsAt.getTime() - startsAt.getTime() > MAX_DURATION_MS) throw new ValidationError("Un code promo dure un an au plus.");

  const data = {
    kind: input.kind,
    value,
    minSubtotal,
    maxUses,
    perClient,
    startsAt: Timestamp.fromDate(startsAt),
    endsAt: Timestamp.fromDate(endsAt),
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (input.id) {
    const ref = db.collection(PROMO_CODES_COLLECTION).doc(input.id);
    const existing = (await ref.get()).data();
    if (!existing || existing.shopId !== shopId) throw new NotFoundError("Code promo introuvable.");
    if (existing.endsAt.toMillis() <= now) throw new ValidationError("Ce code est terminé : il ne se modifie plus.");
    if (maxUses !== null && maxUses < existing.usedCount) {
      throw new ValidationError(`Ce code a déjà servi ${existing.usedCount} fois : la limite ne peut pas descendre en dessous.`);
    }
    await ref.update(data);
    return { id: input.id };
  }

  const code = normalizeCode(input.code);
  if (!CODE_PATTERN.test(code)) {
    throw new ValidationError("Le code compte 3 à 20 caractères : lettres, chiffres ou tirets.");
  }
  const ref = promoCodeRef(db, shopId, code);
  try {
    // `create` échoue si le code existe déjà dans la boutique.
    await ref.create({ ...data, shopId, code, usedCount: 0, createdAt: FieldValue.serverTimestamp() });
  } catch (error) {
    if ((error as { code?: number }).code === 6) throw new ValidationError(`Le code ${code} existe déjà.`);
    throw error;
  }
  return { id: ref.id };
}

async function ownCode(idToken: string, id: string) {
  const db = getAdminDb();
  const { shopId } = await requireManager(db, idToken);
  const ref = db.collection(PROMO_CODES_COLLECTION).doc(id);
  const data = (await ref.get()).data();
  if (!data || data.shopId !== shopId) throw new NotFoundError("Code promo introuvable.");
  return { ref, data };
}

/** Arrête un code tout de suite (il reste dans l'historique). */
export async function endPromoCodeAction(idToken: string, id: string): Promise<void> {
  const { ref, data } = await ownCode(idToken, id);
  const now = Date.now();
  if (data.endsAt.toMillis() <= now) return;
  const end = Math.max(now, data.startsAt.toMillis());
  await ref.update({ endsAt: Timestamp.fromMillis(end), updatedAt: FieldValue.serverTimestamp() });
}

/** Supprime un code qui n'a jamais servi (sinon : l'arrêter). */
export async function deletePromoCodeAction(idToken: string, id: string): Promise<void> {
  const { ref, data } = await ownCode(idToken, id);
  if ((data.usedCount ?? 0) > 0) {
    throw new ValidationError("Ce code a déjà servi : arrêtez-le plutôt, il restera dans l'historique.");
  }
  await ref.delete();
}

export interface CheckedPromoCode {
  code: string;
  kind: PromotionKind;
  value: number;
  discount: number;
}

/**
 * Vérifie un code saisi par le client, pour l'aperçu sur la page de
 * commande. `subtotal` vient du panier (prix à jour) : le serveur refait le
 * calcul, sur ses propres prix, au moment de la commande.
 */
export async function checkPromoCodeAction(
  idToken: string,
  input: { shopId: string; code: string; subtotal: number },
): Promise<CheckedPromoCode> {
  const caller = await requireCaller(idToken);
  const db = getAdminDb();
  const code = normalizeCode(input.code);
  const unknown = new ValidationError("Ce code promo n'existe pas dans cette boutique.");
  if (!CODE_PATTERN.test(code) || !input.shopId) throw unknown;
  const ref = promoCodeRef(db, String(input.shopId), code);
  const [snapshot, uses] = await Promise.all([ref.get(), ref.collection(PROMO_CODE_USES).doc(caller.uid).get()]);
  const data = snapshot.data() as PromoCodeRules | undefined;
  if (!data) throw unknown;
  const subtotal = Math.max(0, Number(input.subtotal) || 0);
  const problem = codeProblem(data, { subtotal, now: Date.now(), clientUses: (uses.data()?.count as number | undefined) ?? 0 });
  if (problem) throw new ValidationError(problem);
  return { code, kind: data.kind, value: data.value, discount: codeDiscount(data, subtotal) };
}

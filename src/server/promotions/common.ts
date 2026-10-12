import "server-only";

import type { Firestore } from "firebase-admin/firestore";

import type { PromotionKind } from "@/models/promotion/Promotion";
import { requireCaller } from "@/server/auth/requireCaller";
import { ForbiddenError, ValidationError } from "@/server/errors";

/** Le gérant de la boutique : les prix sont son affaire (campagnes et codes). */
export async function requireManager(db: Firestore, idToken: string): Promise<{ uid: string; shopId: string }> {
  const caller = await requireCaller(idToken);
  const user = (await db.collection("users").doc(caller.uid).get()).data();
  if (!user || user.role !== "admin" || !user.shopId) throw new ForbiddenError("Seul le gérant gère les promotions.");
  return { uid: caller.uid, shopId: String(user.shopId) };
}

export function parseInstant(value: string, label: string): Date {
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) throw new ValidationError(`Indiquez la date de ${label}.`);
  return new Date(ms);
}

/** Réduction en % (entier, 1 à 90) ou en montant (entier de FCFA). */
export function checkDiscount(kind: PromotionKind, raw: number): number {
  if (kind !== "percent" && kind !== "amount") throw new ValidationError("Choisissez le type de réduction.");
  const value = Number(raw);
  if (kind === "percent" && !(Number.isInteger(value) && value >= 1 && value <= 90)) {
    throw new ValidationError("La réduction doit être comprise entre 1 et 90 %.");
  }
  if (kind === "amount" && !(Number.isInteger(value) && value >= 1 && value <= 10_000_000)) {
    throw new ValidationError("Le montant de la réduction doit être un nombre entier de FCFA.");
  }
  return value;
}

"use server";

import { FieldValue, Timestamp, type Firestore } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebaseAdmin";
import type { PromotionKind, PromotionTarget } from "@/models/promotion/Promotion";
import { requireCaller } from "@/server/auth/requireCaller";
import { ForbiddenError, NotFoundError, ValidationError } from "@/server/errors";
import { PROMOTIONS_COLLECTION } from "@/server/promotions/readCampaigns";

const MAX_TITLE = 60;
const MAX_TARGETS = 200;
/** Une promotion flash est courte : 7 jours au plus. */
const FLASH_MAX_MS = 7 * 24 * 3600 * 1000;
const MAX_DURATION_MS = 366 * 24 * 3600 * 1000;

export interface PromotionInput {
  /** Campagne existante à modifier ; absent : nouvelle campagne. */
  id?: string;
  title: string;
  kind: PromotionKind;
  value: number;
  target: PromotionTarget;
  /** Instants ISO (saisis à l'heure de l'appareil du gérant). */
  startsAt: string;
  endsAt: string;
  flash: boolean;
}

/** Le gérant de la boutique : les prix sont son affaire. */
async function requireManager(db: Firestore, idToken: string): Promise<{ uid: string; shopId: string }> {
  const caller = await requireCaller(idToken);
  const user = (await db.collection("users").doc(caller.uid).get()).data();
  if (!user || user.role !== "admin" || !user.shopId) throw new ForbiddenError("Seul le gérant gère les promotions.");
  return { uid: caller.uid, shopId: String(user.shopId) };
}

function parseInstant(value: string, label: string): Date {
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) throw new ValidationError(`Indiquez la date de ${label}.`);
  return new Date(ms);
}

async function checkTarget(db: Firestore, shopId: string, target: PromotionTarget): Promise<PromotionTarget> {
  if (target?.type === "shop") return { type: "shop" };
  if (target?.type === "categories") {
    const names = [...new Set((target.categories ?? []).map((c) => String(c).trim()).filter(Boolean))];
    if (names.length === 0) throw new ValidationError("Choisissez au moins une catégorie.");
    if (names.length > MAX_TARGETS) throw new ValidationError("Trop de catégories.");
    const existing = await db.collection("categories").where("shopId", "==", shopId).get();
    const known = new Set(existing.docs.map((d) => d.data().name));
    if (names.some((n) => !known.has(n))) throw new ValidationError("Une catégorie choisie n'existe plus.");
    return { type: "categories", categories: names };
  }
  if (target?.type === "products") {
    const ids = [...new Set((target.productIds ?? []).map(String).filter(Boolean))];
    if (ids.length === 0) throw new ValidationError("Choisissez au moins un produit.");
    if (ids.length > MAX_TARGETS) throw new ValidationError("Trop de produits.");
    const snapshots = await db.getAll(...ids.map((id) => db.collection("products").doc(id)));
    if (snapshots.some((s) => s.data()?.shopId !== shopId)) throw new ValidationError("Un produit choisi n'existe plus.");
    return { type: "products", productIds: ids };
  }
  throw new ValidationError("Choisissez à quoi s'applique la promotion.");
}

/**
 * Crée ou modifie une campagne de promotion (BF-30→33, 2026-10-12).
 * Une campagne terminée ne se modifie plus (elle sert d'historique).
 */
export async function savePromotionAction(idToken: string, input: PromotionInput): Promise<{ id: string }> {
  const db = getAdminDb();
  const { shopId } = await requireManager(db, idToken);

  const title = String(input.title ?? "").trim();
  if (!title || title.length > MAX_TITLE) throw new ValidationError(`Donnez un nom à la promotion (${MAX_TITLE} caractères au plus).`);
  if (input.kind !== "percent" && input.kind !== "amount") throw new ValidationError("Choisissez le type de réduction.");
  const value = Number(input.value);
  if (input.kind === "percent" && !(Number.isInteger(value) && value >= 1 && value <= 90)) {
    throw new ValidationError("La réduction doit être comprise entre 1 et 90 %.");
  }
  if (input.kind === "amount" && !(Number.isInteger(value) && value >= 1 && value <= 10_000_000)) {
    throw new ValidationError("Le montant de la réduction doit être un nombre entier de FCFA.");
  }
  const startsAt = parseInstant(input.startsAt, "début");
  const endsAt = parseInstant(input.endsAt, "fin");
  const now = Date.now();
  if (endsAt.getTime() <= startsAt.getTime()) throw new ValidationError("La fin doit venir après le début.");
  if (endsAt.getTime() <= now) throw new ValidationError("La date de fin est déjà passée.");
  if (endsAt.getTime() - startsAt.getTime() > MAX_DURATION_MS) throw new ValidationError("Une promotion dure un an au plus.");
  if (input.flash && endsAt.getTime() - startsAt.getTime() > FLASH_MAX_MS) {
    throw new ValidationError("Une promotion flash dure 7 jours au plus.");
  }
  const target = await checkTarget(db, shopId, input.target);

  const data = {
    shopId,
    title,
    kind: input.kind,
    value,
    target,
    startsAt: Timestamp.fromDate(startsAt),
    endsAt: Timestamp.fromDate(endsAt),
    flash: !!input.flash,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (input.id) {
    const ref = db.collection(PROMOTIONS_COLLECTION).doc(input.id);
    const existing = (await ref.get()).data();
    if (!existing || existing.shopId !== shopId) throw new NotFoundError("Promotion introuvable.");
    if (existing.endsAt.toMillis() <= now) throw new ValidationError("Cette promotion est terminée : elle ne se modifie plus.");
    await ref.update(data);
    return { id: input.id };
  }
  const ref = await db.collection(PROMOTIONS_COLLECTION).add({ ...data, createdAt: FieldValue.serverTimestamp() });
  return { id: ref.id };
}

async function ownPromotion(db: Firestore, shopId: string, id: string) {
  const ref = db.collection(PROMOTIONS_COLLECTION).doc(id);
  const data = (await ref.get()).data();
  if (!data || data.shopId !== shopId) throw new NotFoundError("Promotion introuvable.");
  return { ref, data };
}

/** Termine une campagne tout de suite (elle reste dans l'historique). */
export async function endPromotionAction(idToken: string, id: string): Promise<void> {
  const db = getAdminDb();
  const { shopId } = await requireManager(db, idToken);
  const { ref, data } = await ownPromotion(db, shopId, id);
  const now = Date.now();
  if (data.endsAt.toMillis() <= now) return;
  // Pas encore commencée : la fin rejoint le début (elle n'aura jamais couru).
  const end = Math.max(now, data.startsAt.toMillis());
  await ref.update({ endsAt: Timestamp.fromMillis(end), updatedAt: FieldValue.serverTimestamp() });
}

/** Supprime une campagne qui n'a jamais commencé (sinon : la terminer). */
export async function deletePromotionAction(idToken: string, id: string): Promise<void> {
  const db = getAdminDb();
  const { shopId } = await requireManager(db, idToken);
  const { ref, data } = await ownPromotion(db, shopId, id);
  if (data.startsAt.toMillis() <= Date.now() && data.endsAt.toMillis() > data.startsAt.toMillis()) {
    throw new ValidationError("Cette promotion a déjà commencé : terminez-la plutôt, elle restera dans l'historique.");
  }
  await ref.delete();
}

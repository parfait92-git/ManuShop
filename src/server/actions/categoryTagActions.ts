"use server";

import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebaseAdmin";
import { requireSuperAdmin } from "@/server/auth/requireSuperAdmin";
import { ValidationError } from "@/server/errors";

const CATEGORY_TAGS_COLLECTION = "categoryTags";

/**
 * BF-109→111 : taxonomie système, gérée exclusivement par le Super Admin.
 * Écriture toujours via cette Server Action (`firestore.rules` refuse toute
 * écriture depuis le client, même règle que `platformAdmins`/`configuration`).
 */
export async function createCategoryTagAction(
  idToken: string,
  name: string,
  color: string
): Promise<{ id: string }> {
  await requireSuperAdmin(idToken);

  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new ValidationError("Le nom du tag est requis.");
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
    throw new ValidationError("La couleur doit être un code hexadécimal valide.");
  }

  const ref = getAdminDb().collection(CATEGORY_TAGS_COLLECTION).doc();
  await ref.set({
    name: trimmedName,
    color,
    createdAt: FieldValue.serverTimestamp(),
  });
  return { id: ref.id };
}

/**
 * Seul moyen de renommer/changer la couleur d'un tag déjà créé — jusque-là,
 * il fallait le supprimer et en recréer un, perdant la référence pour
 * toute catégorie qui l'utilisait déjà (`Category.tagId`).
 */
export async function updateCategoryTagAction(
  idToken: string,
  id: string,
  name: string,
  color: string
): Promise<void> {
  await requireSuperAdmin(idToken);

  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new ValidationError("Le nom du tag est requis.");
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
    throw new ValidationError("La couleur doit être un code hexadécimal valide.");
  }

  await getAdminDb().collection(CATEGORY_TAGS_COLLECTION).doc(id).update({
    name: trimmedName,
    color,
  });
}

export async function deleteCategoryTagAction(
  idToken: string,
  id: string
): Promise<void> {
  await requireSuperAdmin(idToken);
  await getAdminDb().collection(CATEGORY_TAGS_COLLECTION).doc(id).delete();
}

"use server";

import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebaseAdmin";
import { ACTIVE_THEME_DOC } from "@/models/theme/ShopTheme";
import { requireCaller } from "@/server/auth/requireCaller";
import { ForbiddenError, ValidationError } from "@/server/errors";
import { hasPremiumAccess, themeItemKey, toShopPremiumState } from "@/lib/premiumCatalog";
import { readPremiumCatalog } from "@/server/premium/readCatalog";
import { isKnownTheme } from "@/themes/registry";

/**
 * Applique un thème à la boutique du gérant (2026-10-03). Réservé au
 * gérant (role admin) — comme les Paramètres, pas aux vendeurs. Le thème
 * doit exister dans le catalogue (`src/themes/registry.ts`).
 */
export async function applyShopThemeAction(idToken: string, themeId: string): Promise<void> {
  const caller = await requireCaller(idToken);
  const db = getAdminDb();

  const user = (await db.collection("users").doc(caller.uid).get()).data();
  if (!user || user.role !== "admin" || !user.shopId) throw new ForbiddenError();
  if (!isKnownTheme(themeId)) throw new ValidationError("Ce thème n'existe pas.");

  // Thème premium : acheté, accordé ou inclus dans l'abonnement en cours.
  const [shopSnapshot, catalog] = await Promise.all([
    db.collection("shops").doc(user.shopId).get(),
    readPremiumCatalog(db),
  ]);
  if (!hasPremiumAccess(themeItemKey(themeId), toShopPremiumState(shopSnapshot.data() ?? {}), catalog)) {
    throw new ForbiddenError("Ce thème est premium : achetez-le pour l'appliquer.");
  }

  await db
    .collection("shops")
    .doc(user.shopId)
    .collection("themes")
    .doc(ACTIVE_THEME_DOC)
    .set({ themeId, appliedAt: FieldValue.serverTimestamp(), appliedBy: caller.uid });
}

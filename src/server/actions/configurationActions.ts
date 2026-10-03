"use server";

import { revalidatePath } from "next/cache";

import { getAdminDb } from "@/lib/firebaseAdmin";
import { validateLaunchPromo, type LaunchPromoSettings } from "@/lib/launchPromo";
import { requireSuperAdmin } from "@/server/auth/requireSuperAdmin";
import { ValidationError } from "@/server/errors";

const CONFIGURATION_COLLECTION = "configuration";
const GENERAL_DOC_ID = "general";

/**
 * Interrupteur manuel de `/demo-catalogue` (`PlatformConfiguration.
 * demoCatalogueEnabled`) — jusqu'ici modifiable uniquement à la main depuis
 * la console Firebase. `set(..., {merge: true})` : le document `general`
 * peut ne pas encore exister (première bascule) et pourra accueillir
 * d'autres réglages plateforme plus tard, sans que l'un écrase l'autre.
 */
/** Taux du dollar en FCFA (`PlatformConfiguration.usdToXafRate`) —
 * revalidé ici : la valeur arrive du navigateur. Bornes larges mais
 * réalistes, pour refuser une faute de frappe grossière (0, négatif, ou un
 * zéro de trop). */
export async function setUsdToXafRateAction(idToken: string, rate: number): Promise<void> {
  await requireSuperAdmin(idToken);
  if (!Number.isFinite(rate) || rate < 50 || rate > 5000) {
    throw new ValidationError("Le taux du dollar doit être compris entre 50 et 5 000 FCFA.");
  }
  await getAdminDb()
    .collection(CONFIGURATION_COLLECTION)
    .doc(GENERAL_DOC_ID)
    .set({ usdToXafRate: rate }, { merge: true });
}

export async function setDemoCatalogueEnabledAction(
  idToken: string,
  enabled: boolean
): Promise<void> {
  await requireSuperAdmin(idToken);
  await getAdminDb()
    .collection(CONFIGURATION_COLLECTION)
    .doc(GENERAL_DOC_ID)
    .set({ demoCatalogueEnabled: enabled }, { merge: true });
}

/**
 * Promotion de la page d'accueil (`PlatformConfiguration.launchPromo`) —
 * revalidée ici avec les mêmes règles que le formulaire, puis l'accueil est
 * régénéré tout de suite (`revalidatePath`) plutôt qu'à sa prochaine
 * expiration de cache.
 */
export async function setLaunchPromoAction(
  idToken: string,
  promo: LaunchPromoSettings
): Promise<void> {
  await requireSuperAdmin(idToken);
  const clean: LaunchPromoSettings = {
    enabled: promo.enabled === true,
    eyebrow: String(promo.eyebrow ?? "").trim(),
    title: String(promo.title ?? "").trim(),
    description: String(promo.description ?? "").trim(),
    endsAt: String(promo.endsAt ?? ""),
  };
  const errors = validateLaunchPromo(clean);
  const first = Object.values(errors)[0];
  if (first) throw new ValidationError(first);
  await getAdminDb()
    .collection(CONFIGURATION_COLLECTION)
    .doc(GENERAL_DOC_ID)
    .set({ launchPromo: clean }, { merge: true });
  revalidatePath("/");
}

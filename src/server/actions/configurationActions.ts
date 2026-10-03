"use server";

import { getAdminDb } from "@/lib/firebaseAdmin";
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

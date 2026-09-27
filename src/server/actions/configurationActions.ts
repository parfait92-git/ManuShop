"use server";

import { getAdminDb } from "@/lib/firebaseAdmin";
import { requireSuperAdmin } from "@/server/auth/requireSuperAdmin";

const CONFIGURATION_COLLECTION = "configuration";
const GENERAL_DOC_ID = "general";

/**
 * Interrupteur manuel de `/demo-catalogue` (`PlatformConfiguration.
 * demoCatalogueEnabled`) — jusqu'ici modifiable uniquement à la main depuis
 * la console Firebase. `set(..., {merge: true})` : le document `general`
 * peut ne pas encore exister (première bascule) et pourra accueillir
 * d'autres réglages plateforme plus tard, sans que l'un écrase l'autre.
 */
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

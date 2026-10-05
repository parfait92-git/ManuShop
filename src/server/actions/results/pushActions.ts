// Fichier généré par scripts/generate-action-layers.mjs — ne pas modifier à la main.
"use server";

import { toActionResult } from "@/server/actionResult";
import * as actions from "@/server/actions/pushActions";

export async function registerPushTokenAction(...args: Parameters<typeof actions.registerPushTokenAction>) {
  return toActionResult(() => actions.registerPushTokenAction(...args));
}

export async function unregisterPushTokenAction(...args: Parameters<typeof actions.unregisterPushTokenAction>) {
  return toActionResult(() => actions.unregisterPushTokenAction(...args));
}

export async function sendTestPushAction(...args: Parameters<typeof actions.sendTestPushAction>) {
  return toActionResult(() => actions.sendTestPushAction(...args));
}

// Fichier généré par scripts/generate-action-layers.mjs — ne pas modifier à la main.
import { unwrapAction } from "@/lib/actionResult";
import * as results from "@/server/actions/results/pushActions";

export async function registerPushTokenAction(...args: Parameters<typeof results.registerPushTokenAction>) {
  return unwrapAction(await results.registerPushTokenAction(...args));
}

export async function unregisterPushTokenAction(...args: Parameters<typeof results.unregisterPushTokenAction>) {
  return unwrapAction(await results.unregisterPushTokenAction(...args));
}

export async function sendTestPushAction(...args: Parameters<typeof results.sendTestPushAction>) {
  return unwrapAction(await results.sendTestPushAction(...args));
}

// Fichier généré par scripts/generate-action-layers.mjs — ne pas modifier à la main.
import { unwrapAction } from "@/lib/actionResult";
import * as results from "@/server/actions/results/supportMessageActions";

export async function sendSupportMessageAction(...args: Parameters<typeof results.sendSupportMessageAction>) {
  return unwrapAction(await results.sendSupportMessageAction(...args));
}

export async function sendContactMessageAction(...args: Parameters<typeof results.sendContactMessageAction>) {
  return unwrapAction(await results.sendContactMessageAction(...args));
}

export async function countOpenSupportMessagesAction(...args: Parameters<typeof results.countOpenSupportMessagesAction>) {
  return unwrapAction(await results.countOpenSupportMessagesAction(...args));
}

export async function listSupportMessagesAction(...args: Parameters<typeof results.listSupportMessagesAction>) {
  return unwrapAction(await results.listSupportMessagesAction(...args));
}

export async function answerSupportMessageAction(...args: Parameters<typeof results.answerSupportMessageAction>) {
  return unwrapAction(await results.answerSupportMessageAction(...args));
}

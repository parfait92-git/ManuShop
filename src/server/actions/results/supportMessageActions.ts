// Fichier généré par scripts/generate-action-layers.mjs — ne pas modifier à la main.
"use server";

import { toActionResult } from "@/server/actionResult";
import * as actions from "@/server/actions/supportMessageActions";

export async function sendSupportMessageAction(...args: Parameters<typeof actions.sendSupportMessageAction>) {
  return toActionResult(() => actions.sendSupportMessageAction(...args));
}

export async function sendContactMessageAction(...args: Parameters<typeof actions.sendContactMessageAction>) {
  return toActionResult(() => actions.sendContactMessageAction(...args));
}

export async function countOpenSupportMessagesAction(...args: Parameters<typeof actions.countOpenSupportMessagesAction>) {
  return toActionResult(() => actions.countOpenSupportMessagesAction(...args));
}

export async function listSupportMessagesAction(...args: Parameters<typeof actions.listSupportMessagesAction>) {
  return toActionResult(() => actions.listSupportMessagesAction(...args));
}

export async function answerSupportMessageAction(...args: Parameters<typeof actions.answerSupportMessageAction>) {
  return toActionResult(() => actions.answerSupportMessageAction(...args));
}

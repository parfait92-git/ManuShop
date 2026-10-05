// Fichier généré par scripts/generate-action-layers.mjs — ne pas modifier à la main.
"use server";

import { toActionResult } from "@/server/actionResult";
import * as actions from "@/server/actions/feedbackActions";

export async function submitDeliveryFeedbackAction(...args: Parameters<typeof actions.submitDeliveryFeedbackAction>) {
  return toActionResult(() => actions.submitDeliveryFeedbackAction(...args));
}

export async function replyToFeedbackAction(...args: Parameters<typeof actions.replyToFeedbackAction>) {
  return toActionResult(() => actions.replyToFeedbackAction(...args));
}

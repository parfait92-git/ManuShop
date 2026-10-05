// Fichier généré par scripts/generate-action-layers.mjs — ne pas modifier à la main.
import { unwrapAction } from "@/lib/actionResult";
import * as results from "@/server/actions/results/feedbackActions";

export async function submitDeliveryFeedbackAction(...args: Parameters<typeof results.submitDeliveryFeedbackAction>) {
  return unwrapAction(await results.submitDeliveryFeedbackAction(...args));
}

export async function replyToFeedbackAction(...args: Parameters<typeof results.replyToFeedbackAction>) {
  return unwrapAction(await results.replyToFeedbackAction(...args));
}

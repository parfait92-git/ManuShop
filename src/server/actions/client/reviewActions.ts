// Fichier généré par scripts/generate-action-layers.mjs — ne pas modifier à la main.
import { unwrapAction } from "@/lib/actionResult";
import * as results from "@/server/actions/results/reviewActions";

export async function submitReviewAction(...args: Parameters<typeof results.submitReviewAction>) {
  return unwrapAction(await results.submitReviewAction(...args));
}

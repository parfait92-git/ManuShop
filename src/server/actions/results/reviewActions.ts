// Fichier généré par scripts/generate-action-layers.mjs — ne pas modifier à la main.
"use server";

import { toActionResult } from "@/server/actionResult";
import * as actions from "@/server/actions/reviewActions";

export async function submitReviewAction(...args: Parameters<typeof actions.submitReviewAction>) {
  return toActionResult(() => actions.submitReviewAction(...args));
}

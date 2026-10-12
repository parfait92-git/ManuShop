// Fichier généré par scripts/generate-action-layers.mjs — ne pas modifier à la main.
"use server";

import { toActionResult } from "@/server/actionResult";
import * as actions from "@/server/actions/promotionActions";

export async function savePromotionAction(...args: Parameters<typeof actions.savePromotionAction>) {
  return toActionResult(() => actions.savePromotionAction(...args));
}

export async function endPromotionAction(...args: Parameters<typeof actions.endPromotionAction>) {
  return toActionResult(() => actions.endPromotionAction(...args));
}

export async function deletePromotionAction(...args: Parameters<typeof actions.deletePromotionAction>) {
  return toActionResult(() => actions.deletePromotionAction(...args));
}

// Fichier généré par scripts/generate-action-layers.mjs — ne pas modifier à la main.
"use server";

import { toActionResult } from "@/server/actionResult";
import * as actions from "@/server/actions/promoCodeActions";

export async function savePromoCodeAction(...args: Parameters<typeof actions.savePromoCodeAction>) {
  return toActionResult(() => actions.savePromoCodeAction(...args));
}

export async function endPromoCodeAction(...args: Parameters<typeof actions.endPromoCodeAction>) {
  return toActionResult(() => actions.endPromoCodeAction(...args));
}

export async function deletePromoCodeAction(...args: Parameters<typeof actions.deletePromoCodeAction>) {
  return toActionResult(() => actions.deletePromoCodeAction(...args));
}

export async function checkPromoCodeAction(...args: Parameters<typeof actions.checkPromoCodeAction>) {
  return toActionResult(() => actions.checkPromoCodeAction(...args));
}

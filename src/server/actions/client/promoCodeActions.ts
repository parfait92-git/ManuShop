// Fichier généré par scripts/generate-action-layers.mjs — ne pas modifier à la main.
import { unwrapAction } from "@/lib/actionResult";
import * as results from "@/server/actions/results/promoCodeActions";

export async function savePromoCodeAction(...args: Parameters<typeof results.savePromoCodeAction>) {
  return unwrapAction(await results.savePromoCodeAction(...args));
}

export async function endPromoCodeAction(...args: Parameters<typeof results.endPromoCodeAction>) {
  return unwrapAction(await results.endPromoCodeAction(...args));
}

export async function deletePromoCodeAction(...args: Parameters<typeof results.deletePromoCodeAction>) {
  return unwrapAction(await results.deletePromoCodeAction(...args));
}

export async function checkPromoCodeAction(...args: Parameters<typeof results.checkPromoCodeAction>) {
  return unwrapAction(await results.checkPromoCodeAction(...args));
}

// Fichier généré par scripts/generate-action-layers.mjs — ne pas modifier à la main.
import { unwrapAction } from "@/lib/actionResult";
import * as results from "@/server/actions/results/promotionActions";

export async function savePromotionAction(...args: Parameters<typeof results.savePromotionAction>) {
  return unwrapAction(await results.savePromotionAction(...args));
}

export async function endPromotionAction(...args: Parameters<typeof results.endPromotionAction>) {
  return unwrapAction(await results.endPromotionAction(...args));
}

export async function deletePromotionAction(...args: Parameters<typeof results.deletePromotionAction>) {
  return unwrapAction(await results.deletePromotionAction(...args));
}

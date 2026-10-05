// Fichier généré par scripts/generate-action-layers.mjs — ne pas modifier à la main.
import { unwrapAction } from "@/lib/actionResult";
import * as results from "@/server/actions/results/stockActions";

export async function restockProductAction(...args: Parameters<typeof results.restockProductAction>) {
  return unwrapAction(await results.restockProductAction(...args));
}

export async function adjustStockAction(...args: Parameters<typeof results.adjustStockAction>) {
  return unwrapAction(await results.adjustStockAction(...args));
}

export async function recordInitialStockAction(...args: Parameters<typeof results.recordInitialStockAction>) {
  return unwrapAction(await results.recordInitialStockAction(...args));
}

export async function saveProductVariantsAction(...args: Parameters<typeof results.saveProductVariantsAction>) {
  return unwrapAction(await results.saveProductVariantsAction(...args));
}

// Fichier généré par scripts/generate-action-layers.mjs — ne pas modifier à la main.
"use server";

import { toActionResult } from "@/server/actionResult";
import * as actions from "@/server/actions/stockActions";

export async function restockProductAction(...args: Parameters<typeof actions.restockProductAction>) {
  return toActionResult(() => actions.restockProductAction(...args));
}

export async function adjustStockAction(...args: Parameters<typeof actions.adjustStockAction>) {
  return toActionResult(() => actions.adjustStockAction(...args));
}

export async function recordInitialStockAction(...args: Parameters<typeof actions.recordInitialStockAction>) {
  return toActionResult(() => actions.recordInitialStockAction(...args));
}

export async function saveProductVariantsAction(...args: Parameters<typeof actions.saveProductVariantsAction>) {
  return toActionResult(() => actions.saveProductVariantsAction(...args));
}

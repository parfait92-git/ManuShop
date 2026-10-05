// Fichier généré par scripts/generate-action-layers.mjs — ne pas modifier à la main.
"use server";

import { toActionResult } from "@/server/actionResult";
import * as actions from "@/server/actions/shopActions";

export async function createShopAction(...args: Parameters<typeof actions.createShopAction>) {
  return toActionResult(() => actions.createShopAction(...args));
}

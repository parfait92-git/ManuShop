// Fichier généré par scripts/generate-action-layers.mjs — ne pas modifier à la main.
"use server";

import { toActionResult } from "@/server/actionResult";
import * as actions from "@/server/actions/themeActions";

export async function applyShopThemeAction(...args: Parameters<typeof actions.applyShopThemeAction>) {
  return toActionResult(() => actions.applyShopThemeAction(...args));
}

// Fichier généré par scripts/generate-action-layers.mjs — ne pas modifier à la main.
import { unwrapAction } from "@/lib/actionResult";
import * as results from "@/server/actions/results/themeActions";

export async function applyShopThemeAction(...args: Parameters<typeof results.applyShopThemeAction>) {
  return unwrapAction(await results.applyShopThemeAction(...args));
}

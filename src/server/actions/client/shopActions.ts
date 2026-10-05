// Fichier généré par scripts/generate-action-layers.mjs — ne pas modifier à la main.
import { unwrapAction } from "@/lib/actionResult";
import * as results from "@/server/actions/results/shopActions";

export async function createShopAction(...args: Parameters<typeof results.createShopAction>) {
  return unwrapAction(await results.createShopAction(...args));
}

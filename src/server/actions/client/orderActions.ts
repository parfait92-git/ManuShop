// Fichier généré par scripts/generate-action-layers.mjs — ne pas modifier à la main.
import { unwrapAction } from "@/lib/actionResult";
import * as results from "@/server/actions/results/orderActions";

export async function createOrderAction(...args: Parameters<typeof results.createOrderAction>) {
  return unwrapAction(await results.createOrderAction(...args));
}

export async function updateOrderStatusAction(...args: Parameters<typeof results.updateOrderStatusAction>) {
  return unwrapAction(await results.updateOrderStatusAction(...args));
}

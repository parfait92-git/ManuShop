// Fichier généré par scripts/generate-action-layers.mjs — ne pas modifier à la main.
"use server";

import { toActionResult } from "@/server/actionResult";
import * as actions from "@/server/actions/orderActions";

export async function createOrderAction(...args: Parameters<typeof actions.createOrderAction>) {
  return toActionResult(() => actions.createOrderAction(...args));
}

export async function updateOrderStatusAction(...args: Parameters<typeof actions.updateOrderStatusAction>) {
  return toActionResult(() => actions.updateOrderStatusAction(...args));
}

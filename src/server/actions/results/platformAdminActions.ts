// Fichier généré par scripts/generate-action-layers.mjs — ne pas modifier à la main.
"use server";

import { toActionResult } from "@/server/actionResult";
import * as actions from "@/server/actions/platformAdminActions";

export async function grantAdminAction(...args: Parameters<typeof actions.grantAdminAction>) {
  return toActionResult(() => actions.grantAdminAction(...args));
}

export async function revokeAdminAction(...args: Parameters<typeof actions.revokeAdminAction>) {
  return toActionResult(() => actions.revokeAdminAction(...args));
}

export async function searchUsersAction(...args: Parameters<typeof actions.searchUsersAction>) {
  return toActionResult(() => actions.searchUsersAction(...args));
}

export async function listMerchantsAction(...args: Parameters<typeof actions.listMerchantsAction>) {
  return toActionResult(() => actions.listMerchantsAction(...args));
}

export async function setShopPremiumFeatureAction(...args: Parameters<typeof actions.setShopPremiumFeatureAction>) {
  return toActionResult(() => actions.setShopPremiumFeatureAction(...args));
}

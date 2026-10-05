// Fichier généré par scripts/generate-action-layers.mjs — ne pas modifier à la main.
import { unwrapAction } from "@/lib/actionResult";
import * as results from "@/server/actions/results/platformAdminActions";

export async function grantAdminAction(...args: Parameters<typeof results.grantAdminAction>) {
  return unwrapAction(await results.grantAdminAction(...args));
}

export async function revokeAdminAction(...args: Parameters<typeof results.revokeAdminAction>) {
  return unwrapAction(await results.revokeAdminAction(...args));
}

export async function searchUsersAction(...args: Parameters<typeof results.searchUsersAction>) {
  return unwrapAction(await results.searchUsersAction(...args));
}

export async function listMerchantsAction(...args: Parameters<typeof results.listMerchantsAction>) {
  return unwrapAction(await results.listMerchantsAction(...args));
}

export async function setShopPremiumFeatureAction(...args: Parameters<typeof results.setShopPremiumFeatureAction>) {
  return unwrapAction(await results.setShopPremiumFeatureAction(...args));
}

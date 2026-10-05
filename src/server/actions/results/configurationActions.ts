// Fichier généré par scripts/generate-action-layers.mjs — ne pas modifier à la main.
"use server";

import { toActionResult } from "@/server/actionResult";
import * as actions from "@/server/actions/configurationActions";

export async function setUsdToXafRateAction(...args: Parameters<typeof actions.setUsdToXafRateAction>) {
  return toActionResult(() => actions.setUsdToXafRateAction(...args));
}

export async function setDemoCatalogueEnabledAction(...args: Parameters<typeof actions.setDemoCatalogueEnabledAction>) {
  return toActionResult(() => actions.setDemoCatalogueEnabledAction(...args));
}

export async function setLaunchPromoAction(...args: Parameters<typeof actions.setLaunchPromoAction>) {
  return toActionResult(() => actions.setLaunchPromoAction(...args));
}

export async function setSiteUrlAction(...args: Parameters<typeof actions.setSiteUrlAction>) {
  return toActionResult(() => actions.setSiteUrlAction(...args));
}

export async function getSiteUrlSettingsAction(...args: Parameters<typeof actions.getSiteUrlSettingsAction>) {
  return toActionResult(() => actions.getSiteUrlSettingsAction(...args));
}

// Fichier généré par scripts/generate-action-layers.mjs — ne pas modifier à la main.
import { unwrapAction } from "@/lib/actionResult";
import * as results from "@/server/actions/results/configurationActions";

export async function setUsdToXafRateAction(...args: Parameters<typeof results.setUsdToXafRateAction>) {
  return unwrapAction(await results.setUsdToXafRateAction(...args));
}

export async function setDemoCatalogueEnabledAction(...args: Parameters<typeof results.setDemoCatalogueEnabledAction>) {
  return unwrapAction(await results.setDemoCatalogueEnabledAction(...args));
}

export async function setLaunchPromoAction(...args: Parameters<typeof results.setLaunchPromoAction>) {
  return unwrapAction(await results.setLaunchPromoAction(...args));
}

export async function setSiteUrlAction(...args: Parameters<typeof results.setSiteUrlAction>) {
  return unwrapAction(await results.setSiteUrlAction(...args));
}

export async function getSiteUrlSettingsAction(...args: Parameters<typeof results.getSiteUrlSettingsAction>) {
  return unwrapAction(await results.getSiteUrlSettingsAction(...args));
}

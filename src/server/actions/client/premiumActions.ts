// Fichier généré par scripts/generate-action-layers.mjs — ne pas modifier à la main.
import { unwrapAction } from "@/lib/actionResult";
import * as results from "@/server/actions/results/premiumActions";

export async function setPremiumCatalogAction(...args: Parameters<typeof results.setPremiumCatalogAction>) {
  return unwrapAction(await results.setPremiumCatalogAction(...args));
}

export async function requestPremiumItemAction(...args: Parameters<typeof results.requestPremiumItemAction>) {
  return unwrapAction(await results.requestPremiumItemAction(...args));
}

export async function listPremiumRequestsAction(...args: Parameters<typeof results.listPremiumRequestsAction>) {
  return unwrapAction(await results.listPremiumRequestsAction(...args));
}

export async function decidePremiumRequestAction(...args: Parameters<typeof results.decidePremiumRequestAction>) {
  return unwrapAction(await results.decidePremiumRequestAction(...args));
}

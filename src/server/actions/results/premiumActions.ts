// Fichier généré par scripts/generate-action-layers.mjs — ne pas modifier à la main.
"use server";

import { toActionResult } from "@/server/actionResult";
import * as actions from "@/server/actions/premiumActions";

export async function setPremiumCatalogAction(...args: Parameters<typeof actions.setPremiumCatalogAction>) {
  return toActionResult(() => actions.setPremiumCatalogAction(...args));
}

export async function requestPremiumItemAction(...args: Parameters<typeof actions.requestPremiumItemAction>) {
  return toActionResult(() => actions.requestPremiumItemAction(...args));
}

export async function listPremiumRequestsAction(...args: Parameters<typeof actions.listPremiumRequestsAction>) {
  return toActionResult(() => actions.listPremiumRequestsAction(...args));
}

export async function decidePremiumRequestAction(...args: Parameters<typeof actions.decidePremiumRequestAction>) {
  return toActionResult(() => actions.decidePremiumRequestAction(...args));
}

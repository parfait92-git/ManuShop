// Fichier généré par scripts/generate-action-layers.mjs — ne pas modifier à la main.
"use server";

import { toActionResult } from "@/server/actionResult";
import * as actions from "@/server/actions/categoryTagActions";

export async function createCategoryTagAction(...args: Parameters<typeof actions.createCategoryTagAction>) {
  return toActionResult(() => actions.createCategoryTagAction(...args));
}

export async function updateCategoryTagAction(...args: Parameters<typeof actions.updateCategoryTagAction>) {
  return toActionResult(() => actions.updateCategoryTagAction(...args));
}

export async function deleteCategoryTagAction(...args: Parameters<typeof actions.deleteCategoryTagAction>) {
  return toActionResult(() => actions.deleteCategoryTagAction(...args));
}

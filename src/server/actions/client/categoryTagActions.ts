// Fichier généré par scripts/generate-action-layers.mjs — ne pas modifier à la main.
import { unwrapAction } from "@/lib/actionResult";
import * as results from "@/server/actions/results/categoryTagActions";

export async function createCategoryTagAction(...args: Parameters<typeof results.createCategoryTagAction>) {
  return unwrapAction(await results.createCategoryTagAction(...args));
}

export async function updateCategoryTagAction(...args: Parameters<typeof results.updateCategoryTagAction>) {
  return unwrapAction(await results.updateCategoryTagAction(...args));
}

export async function deleteCategoryTagAction(...args: Parameters<typeof results.deleteCategoryTagAction>) {
  return unwrapAction(await results.deleteCategoryTagAction(...args));
}

/**
 * Génère, pour chaque moduleName d'actions serveur (`src/server/actions/*Actions.ts`),
 * les deux couches qui font passer les messages d'erreur jusqu'au client
 * (2026-10-04, voir `src/lib/actionResult.ts`) :
 *   - `src/server/actions/results/<moduleName>.ts` ("use server") : chaque action,
 *     ses erreurs attendues renvoyées comme valeur ;
 *   - `src/server/actions/client/<moduleName>.ts` : mêmes noms, côté client, qui
 *     relancent l'erreur avec son message — les services importent celles-ci.
 * À relancer après l'ajout d'une action :  node scripts/generate-action-layers.mjs
 * (un test vérifie que les couches sont à jour).
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ACTIONS = join(dirname(fileURLToPath(import.meta.url)), "../src/server/actions");
const HEADER = "// Fichier généré par scripts/generate-action-layers.mjs — ne pas modifier à la main.\n";

export function actionNames(source) {
  return [...source.matchAll(/^export async function (\w+)\(/gm)].map((m) => m[1]);
}

export function resultsLayer(moduleName, names) {
  return `${HEADER}"use server";

import { toActionResult } from "@/server/actionResult";
import * as actions from "@/server/actions/${moduleName}";

${names
  .map(
    (n) => `export async function ${n}(...args: Parameters<typeof actions.${n}>) {
  return toActionResult(() => actions.${n}(...args));
}
`
  )
  .join("\n")}`;
}

export function clientLayer(moduleName, names) {
  return `${HEADER}import { unwrapAction } from "@/lib/actionResult";
import * as results from "@/server/actions/results/${moduleName}";

${names
  .map(
    (n) => `export async function ${n}(...args: Parameters<typeof results.${n}>) {
  return unwrapAction(await results.${n}(...args));
}
`
  )
  .join("\n")}`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  mkdirSync(join(ACTIONS, "results"), { recursive: true });
  mkdirSync(join(ACTIONS, "client"), { recursive: true });
  for (const file of readdirSync(ACTIONS).filter((f) => /Actions\.ts$/.test(f))) {
    const moduleName = file.replace(/\.ts$/, "");
    const names = actionNames(readFileSync(join(ACTIONS, file), "utf8"));
    writeFileSync(join(ACTIONS, "results", file), resultsLayer(moduleName, names));
    writeFileSync(join(ACTIONS, "client", file), clientLayer(moduleName, names));
    console.log(moduleName, names.length);
  }
}

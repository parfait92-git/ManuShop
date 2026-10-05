/**
 * Résultat d'une action serveur (2026-10-04). En production, Next masque le
 * message des erreurs levées par une action serveur (le client ne reçoit
 * qu'un identifiant) : « Stock insuffisant pour… » devenait un message
 * technique illisible. Les erreurs attendues (validation, droits, élément
 * introuvable) voyagent donc comme valeur de retour, comme le recommande la
 * documentation de Next, puis sont relancées côté client avec leur message.
 */
export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

/** Côté client : la donnée, ou une `Error` portant le message du serveur. */
export function unwrapAction<T>(result: ActionResult<T>): T {
  if (result.ok) return result.data;
  throw new Error(result.error);
}

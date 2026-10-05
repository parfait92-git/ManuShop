import "server-only";

import type { ActionResult } from "@/lib/actionResult";
import { ForbiddenError, NotFoundError, UnauthenticatedError, ValidationError } from "@/server/errors";

const EXPECTED = [ValidationError, ForbiddenError, NotFoundError, UnauthenticatedError];

/**
 * Exécute une action et renvoie ses erreurs attendues comme valeur (voir
 * `lib/actionResult.ts`). Une erreur inattendue reste levée : son détail
 * n'a pas à sortir du serveur.
 */
export async function toActionResult<T>(run: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await run() };
  } catch (error) {
    if (EXPECTED.some((type) => error instanceof type)) {
      return { ok: false, error: (error as Error).message };
    }
    throw error;
  }
}

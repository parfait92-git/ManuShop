import "server-only";

import { verifyIdToken, type VerifiedIdToken } from "@/lib/verifyIdToken";
import { UnauthenticatedError } from "@/server/errors";

/**
 * Vérifie l'identité de l'appelant d'une Server Action privilégiée.
 * Réutilise `verifyIdToken` (JWKS via `jose`, déjà utilisé par
 * `/api/uploads`) plutôt que `firebase-admin`'s propre `verifyIdToken` —
 * pas besoin de deux mécanismes de vérification d'identité ; `firebase-admin`
 * n'est introduit ici que pour l'accès Firestore qui contourne les règles
 * (voir `lib/firebaseAdmin.ts`).
 */
export async function requireCaller(idToken: string): Promise<VerifiedIdToken> {
  const caller = await verifyIdToken(`Bearer ${idToken}`);
  if (!caller) {
    throw new UnauthenticatedError();
  }
  return caller;
}

import "server-only";

import { getAdminDb } from "@/lib/firebaseAdmin";
import { requireCaller } from "@/server/auth/requireCaller";
import { ForbiddenError } from "@/server/errors";
import type { VerifiedIdToken } from "@/lib/verifyIdToken";

const PLATFORM_ADMINS_COLLECTION = "platformAdmins";

/**
 * Vérifie que l'appelant est Super Admin (membre de `platformAdmins`) —
 * première fois que cette règle existe en code plutôt qu'uniquement dans
 * `firestore.rules`. Un compte sans email ne peut jamais être Super Admin,
 * comme côté client (`PlatformAdminService.isSuperAdmin`).
 */
export async function requireSuperAdmin(idToken: string): Promise<VerifiedIdToken> {
  const caller = await requireCaller(idToken);

  if (!caller.email) {
    throw new ForbiddenError();
  }

  const snapshot = await getAdminDb()
    .collection(PLATFORM_ADMINS_COLLECTION)
    .doc(caller.email.toLowerCase())
    .get();

  if (!snapshot.exists) {
    throw new ForbiddenError();
  }

  return caller;
}

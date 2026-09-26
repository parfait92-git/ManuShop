import "server-only";
import { createRemoteJWKSet, jwtVerify } from "jose";

import { getAdminAuth } from "@/lib/firebaseAdmin";

// This mainly predates `firebase-admin` becoming a real dependency of the
// project (added later for privileged Server Actions, see
// `lib/firebaseAdmin.ts`) — kept as the production path since it needs no
// service account at all, just Google's public JWKS. Validate the RS256
// signature against Google's public JWKS for the `securetoken` service
// account, plus issuer/audience — Firebase's own documented approach for
// runtimes without the Admin SDK.
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

const jwks = createRemoteJWKSet(
  new URL(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
  )
);

export interface VerifiedIdToken {
  uid: string;
  email?: string;
}

/** Returns the verified token's claims, or null if missing/invalid/expired. */
export async function verifyIdToken(
  authorizationHeader: string | null
): Promise<VerifiedIdToken | null> {
  if (!authorizationHeader?.startsWith("Bearer ")) return null;
  const token = authorizationHeader.slice("Bearer ".length);

  // Émulateur Auth local (`FIREBASE_AUTH_EMULATOR_HOST`, voir `npm run
  // emulators`) : ses ID tokens ne sont jamais signés par les clés de
  // production Google ci-dessus, `jwtVerify` les rejetterait toujours.
  // `firebase-admin` sait vérifier un token émulateur (il détecte cette
  // même variable) — jamais pris en production, où elle n'est pas définie.
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    try {
      const decoded = await getAdminAuth().verifyIdToken(token);
      return { uid: decoded.uid, email: decoded.email };
    } catch {
      return null;
    }
  }

  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });

    if (typeof payload.sub !== "string") return null;

    return {
      uid: payload.sub,
      email: typeof payload.email === "string" ? payload.email : undefined,
    };
  } catch {
    return null;
  }
}

import "server-only";
import { createRemoteJWKSet, jwtVerify } from "jose";

// Verifies a Firebase Auth ID token without the `firebase-admin` SDK (not a
// dependency of this project — see AuthService.inviteSeller for the same
// constraint). This is Firebase's own documented approach for runtimes that
// can't use the Admin SDK: validate the RS256 signature against Google's
// public JWKS for the `securetoken` service account, plus issuer/audience.
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

import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

const ADMIN_APP_NAME = "manushop-admin";

/**
 * Initialisation paresseuse : `cert()` jette immédiatement si le
 * service-account est absent/invalide, contrairement au SDK client qui
 * tolère des champs `undefined` (voir `lib/firebase.ts`). On ne l'appelle
 * qu'à la première utilisation réelle (`getAdminDb()`), jamais au
 * chargement du module — sinon un simple import casserait `npm run build`
 * même sur des chemins qui n'exécutent jamais de code privilégié.
 */
function getAdminApp(): App {
  const existing = getApps().find((app) => app.name === ADMIN_APP_NAME);
  if (existing) return existing;

  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64;
  if (!encoded) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY_BASE64 est manquant — requis pour toute opération serveur privilégiée."
    );
  }

  const serviceAccount = JSON.parse(
    Buffer.from(encoded, "base64").toString("utf-8")
  );

  return initializeApp({ credential: cert(serviceAccount) }, ADMIN_APP_NAME);
}

/** Firestore via le SDK Admin — contourne `firestore.rules` (voir
 * `src/server/auth/`, qui réimplémente les vérifications de privilège
 * nécessaires en code avant tout appel ici). */
export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}

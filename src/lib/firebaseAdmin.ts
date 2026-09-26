import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
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

  // Émulateur Firestore local (`FIRESTORE_EMULATOR_HOST`, voir `npm run
  // emulators` et docs/04-besoins-techniques.md §17) : le SDK Admin route
  // automatiquement vers l'émulateur dès que cette variable est présente,
  // sans compte de service — utile pour les tests QA (commandes, création
  // de boutique...) en attendant un vrai compte de service/les API
  // externes (WhatsApp Business, paiement). Jamais actif en production :
  // cette variable n'existe que dans un `.env.local` positionné à la main.
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    return initializeApp(
      { projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID },
      ADMIN_APP_NAME
    );
  }

  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64;
  if (!encoded) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY_BASE64 est manquant — requis pour toute opération serveur privilégiée (ou lancez l'émulateur local, voir `npm run emulators`)."
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

/** Auth via le SDK Admin — utilisé uniquement par `verifyIdToken` pour
 * vérifier un ID token émis par l'émulateur Auth local (`FIREBASE_AUTH_
 * EMULATOR_HOST`), que la vérification JWKS habituelle (contre les clés de
 * production Google) rejette toujours. Jamais utilisé hors de ce cas. */
export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

import {
  initializeApp,
  getApps,
  getApp,
  type FirebaseOptions,
} from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Avoid re-initializing during Next.js hot reload / multiple imports.
export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);

/**
 * Émulateurs Firebase locaux (`npm run emulators`) — pour tester commandes/
 * création de boutique/etc. sans compte de service ni API externes réelles
 * (voir docs/04-besoins-techniques.md §17). N'a aucun effet tant que
 * `NEXT_PUBLIC_USE_FIREBASE_EMULATOR` n'est pas positionné à `"true"` dans
 * `.env.local` — jamais actif en production. `connectXEmulator` lève si
 * appelé deux fois sur la même instance (hot reload Next.js), d'où le drapeau
 * module-level plutôt qu'un appel inconditionnel.
 */
let emulatorsConnected = false;
if (
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true" &&
  !emulatorsConnected
) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  emulatorsConnected = true;
}

const SECONDARY_APP_NAME = "Secondary";

/**
 * A second, isolated Firebase App instance used to create other users'
 * accounts (e.g. an admin inviting a Vendeur) without disturbing the
 * currently signed-in user on the primary `auth` instance — the Firebase
 * client SDK otherwise signs in as whichever account was just created.
 * There is no `firebase-admin` in this project, so this is the standard
 * client-only workaround.
 */
export function getSecondaryAuth(): Auth {
  const existing = getApps().find((app) => app.name === SECONDARY_APP_NAME);
  const secondaryApp = existing ?? initializeApp(firebaseConfig, SECONDARY_APP_NAME);
  const secondaryAuth = getAuth(secondaryApp);
  if (
    !existing &&
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true"
  ) {
    connectAuthEmulator(secondaryAuth, "http://127.0.0.1:9099", {
      disableWarnings: true,
    });
  }
  return secondaryAuth;
}

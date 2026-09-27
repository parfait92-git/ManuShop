/**
 * @jest-environment node
 */
// Reproduit un bug réel en production : `firebase-admin/auth` plante au
// CHARGEMENT dans l'environnement serverless Vercel
// (`ERR_REQUIRE_ESM`, via jwks-rsa -> le build "webapi" ESM-only de jose —
// voir 04-besoins-techniques.md §29). Un import statique en haut de ce
// fichier ferait planter TOUT appelant de `getAdminDb()` aussi, même ceux
// qui n'utilisent jamais `getAdminAuth()`. On simule ce crash en faisant
// planter `firebase-admin/auth` lui-même : `getAdminDb` ne doit jamais le
// toucher, et l'import ne doit se produire qu'au moment où `getAdminAuth()`
// est réellement appelée.

jest.mock("firebase-admin/auth", () => {
  throw new Error(
    "ERR_REQUIRE_ESM (simulate) — firebase-admin/auth should never be eagerly imported"
  );
});

jest.mock("firebase-admin/app", () => ({
  getApps: () => [],
  initializeApp: jest.fn(() => ({ name: "manushop-admin" })),
  cert: jest.fn(),
}));

jest.mock("firebase-admin/firestore", () => ({
  getFirestore: jest.fn(() => "firestore-stub"),
}));

import { getAdminAuth, getAdminDb } from "./firebaseAdmin";

describe("lib/firebaseAdmin", () => {
  const originalEnv = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64;

  beforeEach(() => {
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64 = Buffer.from(
      JSON.stringify({ project_id: "manushop-test" })
    ).toString("base64");
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64;
    } else {
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64 = originalEnv;
    }
  });

  it("getAdminDb() never touches the crash-prone firebase-admin/auth module", () => {
    expect(() => getAdminDb()).not.toThrow();
  });

  it("getAdminAuth() surfaces the firebase-admin/auth failure only when actually called", async () => {
    await expect(getAdminAuth()).rejects.toThrow(/ERR_REQUIRE_ESM/);
  });
});

/**
 * @jest-environment node
 */
// Reproduit un bug réel en production : le SDK Cloudinary lit
// `process.env.CLOUDINARY_URL` lui-même dès son PROPRE chargement (avant
// même notre appel à `.config()`) et lève une exception SYNCHRONE si elle
// est présente mais mal formée — un crash au chargement du module, jamais
// intercepté par le try/catch de `/api/uploads` (voir
// 04-besoins-techniques.md §28). Chaque cas importe le module dans un
// registre isolé (`jest.isolateModules`) pour retrigger son code de premier
// niveau avec un `process.env` différent à chaque fois — indispensable ici
// puisque `getCloudinary()` mémorise son instance après le premier appel.

// `getCloudinary()` mémorise son instance après le premier appel : chaque
// cas a besoin d'une copie fraîche du module pour retrigger son code de
// premier niveau avec un `process.env` différent — d'où `require()` dans
// un registre isolé plutôt qu'un `import` statique une seule fois en haut
// du fichier.
function loadCloudinaryModule(): typeof import("./cloudinary") {
  let cloudinaryModule!: typeof import("./cloudinary");
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cloudinaryModule = require("./cloudinary");
  });
  return cloudinaryModule;
}

describe("lib/cloudinary", () => {
  const originalUrl = process.env.CLOUDINARY_URL;

  afterEach(() => {
    if (originalUrl === undefined) {
      delete process.env.CLOUDINARY_URL;
    } else {
      process.env.CLOUDINARY_URL = originalUrl;
    }
  });

  it("does not crash when CLOUDINARY_URL is malformed (Vercel misconfiguration)", async () => {
    process.env.CLOUDINARY_URL = "not-a-valid-cloudinary-url";

    await expect(loadCloudinaryModule().getCloudinary()).resolves.toBeDefined();
  });

  it("removes CLOUDINARY_URL from process.env before the SDK can parse it", async () => {
    process.env.CLOUDINARY_URL = "cloudinary://key:secret@cloud-name";

    await loadCloudinaryModule().getCloudinary();

    expect(process.env.CLOUDINARY_URL).toBeUndefined();
  });

  it("still resolves cleanly when CLOUDINARY_URL was never set", async () => {
    delete process.env.CLOUDINARY_URL;

    await expect(loadCloudinaryModule().getCloudinary()).resolves.toBeDefined();
  });

  it("memoizes the configured instance across calls", async () => {
    const cloudinaryModule = loadCloudinaryModule();

    const first = await cloudinaryModule.getCloudinary();
    const second = await cloudinaryModule.getCloudinary();

    expect(first).toBe(second);
  });
});

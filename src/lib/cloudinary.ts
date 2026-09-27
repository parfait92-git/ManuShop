import "server-only";

let cloudinaryInstance: typeof import("cloudinary").v2 | undefined;

/**
 * Import dynamique et paresseux — pas qu'une init différée comme
 * `getAdminApp()` (`lib/firebaseAdmin.ts`) : le SDK Cloudinary lit
 * `process.env.CLOUDINARY_URL` lui-même dès son PROPRE chargement (avant
 * même notre appel à `.config()` plus bas) et lève une exception SYNCHRONE
 * si elle est présente mais mal formée (ex. ne commence pas par
 * "cloudinary://") — voir node_modules/cloudinary/lib/config.js, appelé en
 * cascade depuis node_modules/cloudinary/lib/utils/index.js dès l'import du
 * paquet. Un `import` STATIQUE de "cloudinary" en haut de ce fichier
 * s'exécuterait immédiatement au chargement du module, donc avant qu'on
 * ait pu supprimer cette variable — bug réel rencontré en production
 * (crash au chargement de `/api/uploads`, avant même d'entrer dans le
 * handler, donc jamais intercepté par son try/catch), voir
 * 04-besoins-techniques.md §28.
 */
export async function getCloudinary() {
  if (!cloudinaryInstance) {
    delete process.env.CLOUDINARY_URL;
    const { v2 } = await import("cloudinary");
    v2.config({
      cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    cloudinaryInstance = v2;
  }
  return cloudinaryInstance;
}

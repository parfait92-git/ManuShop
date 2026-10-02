import type { Area } from "react-easy-crop";

/** Toutes les photos produit sont recadrées à ce format carré avant l'envoi :
 * `StorefrontProductCard` et la table `ProductList` les affichent toutes en
 * `aspect-square` + `object-cover`. 1000px couvre confortablement la plus
 * grande taille d'affichage (~33vw sur un écran large) sans peser inutilement
 * lourd pour une simple photo de catalogue. */
export const PRODUCT_IMAGE_SIZE = 1000;

/** Un logo de boutique s'affiche toujours en petit (avatar/vignette) —
 * jamais en grand comme une photo produit — 512px suffit largement. */
export const LOGO_IMAGE_SIZE = 512;

/** Photo de profil personnelle — même raisonnement que `LOGO_IMAGE_SIZE`
 * (toujours affichée en petit, jamais en grand). */
export const AVATAR_IMAGE_SIZE = 512;

/** Poids maximal visé pour une photo produit (1000×1000) une fois compressée.
 * Une photo de téléphone brute pèse souvent 3 à 8 Mo : la compression avant
 * l'envoi économise les données mobiles du vendeur à l'upload et celles des
 * clients à chaque affichage du catalogue. */
export const PRODUCT_IMAGE_MAX_BYTES = 250 * 1024;

/** Logo et avatar (512×512, toujours affichés en petit). */
export const SMALL_IMAGE_MAX_BYTES = 100 * 1024;

/** Qualités essayées dans l'ordre jusqu'à passer sous le poids visé. La
 * dernière est conservée même si elle dépasse encore : en dessous, les
 * artefacts de compression deviennent visibles sur une photo produit. */
const COMPRESSION_QUALITIES = [0.82, 0.72, 0.62, 0.5];

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () =>
      reject(new Error("Impossible de charger l'image."))
    );
    image.src = src;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Échec du recadrage de l'image.")),
      type,
      quality
    );
  });
}

/** Encode le canvas en WebP (≈30 % plus léger que JPEG à qualité égale),
 * en baissant la qualité jusqu'à passer sous `maxBytes`. Un navigateur qui
 * ne sait pas encoder le WebP (vieux Safari) renvoie silencieusement du PNG
 * — bien plus lourd — au lieu d'échouer : on détecte ce cas via `blob.type`
 * et on repasse alors en JPEG. */
export async function compressCanvas(
  canvas: HTMLCanvasElement,
  maxBytes: number
): Promise<Blob> {
  let type = "image/webp";
  let blob: Blob | undefined;
  for (const quality of COMPRESSION_QUALITIES) {
    blob = await canvasToBlob(canvas, type, quality);
    if (blob.type !== type) {
      type = "image/jpeg";
      blob = await canvasToBlob(canvas, type, quality);
    }
    if (blob.size <= maxBytes) break;
  }
  return blob!;
}

/** Découpe `crop` (en pixels de l'image source), redimensionne le résultat
 * en un carré `size` × `size` et le compresse sous `maxBytes`. */
export async function cropImageToSquare(
  imageSrc: string,
  crop: Area,
  size: number = PRODUCT_IMAGE_SIZE,
  maxBytes: number = PRODUCT_IMAGE_MAX_BYTES
): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Le recadrage d'image n'est pas supporté par ce navigateur.");
  }

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    size,
    size
  );

  return compressCanvas(canvas, maxBytes);
}

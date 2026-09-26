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

/** Découpe `crop` (en pixels de l'image source) et redimensionne le résultat
 * en un carré `size` × `size`, encodé en JPEG. */
export async function cropImageToSquare(
  imageSrc: string,
  crop: Area,
  size: number = PRODUCT_IMAGE_SIZE
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

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Échec du recadrage de l'image.")),
      "image/jpeg",
      0.9
    );
  });
}

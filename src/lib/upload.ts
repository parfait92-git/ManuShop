import { auth } from "@/lib/firebase";

/** Accepte un `Blob` brut (pas seulement `File`) : les photos passent par un
 * recadrage canvas (`cropImageToSquare`) avant l'envoi, qui produit un
 * `Blob` sans nom de fichier. */
async function uploadImage(
  file: Blob,
  filename: string,
  folder?: string
): Promise<string> {
  if (!auth.currentUser) {
    throw new Error("Vous devez être connecté pour envoyer une image.");
  }
  const idToken = await auth.currentUser.getIdToken();

  const formData = new FormData();
  // Le 3e argument (nom de fichier) est nécessaire : sans lui, un `Blob`
  // n'est pas converti en `File` côté FormData, et l'API `/api/uploads`
  // rejette tout ce qui n'est pas `instanceof File`.
  formData.append("file", file, filename);
  if (folder) formData.append("folder", folder);

  const response = await fetch("/api/uploads", {
    method: "POST",
    headers: { Authorization: `Bearer ${idToken}` },
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "Échec de l'envoi de l'image.");
  }

  return data.url as string;
}

export function uploadProductImage(file: Blob): Promise<string> {
  return uploadImage(file, "product-image.jpg");
}

export function uploadShopLogo(file: Blob): Promise<string> {
  return uploadImage(file, "shop-logo.jpg", "manushop/shops");
}

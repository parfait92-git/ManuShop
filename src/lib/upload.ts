import { auth } from "@/lib/firebase";

/** Accepte un `Blob` brut (pas seulement `File`) : les photos produit
 * passent par un recadrage canvas (`cropImageToSquare`) avant l'envoi, qui
 * produit un `Blob` sans nom de fichier. */
export async function uploadProductImage(file: Blob): Promise<string> {
  if (!auth.currentUser) {
    throw new Error("Vous devez être connecté pour envoyer une image.");
  }
  const idToken = await auth.currentUser.getIdToken();

  const formData = new FormData();
  // Le 3e argument (nom de fichier) est nécessaire : sans lui, un `Blob`
  // n'est pas converti en `File` côté FormData, et l'API `/api/uploads`
  // rejette tout ce qui n'est pas `instanceof File`.
  formData.append("file", file, "product-image.jpg");

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

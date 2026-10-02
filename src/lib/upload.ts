import { auth } from "@/lib/firebase";

/** Accepte un `Blob` brut (pas seulement `File`) : les photos passent par un
 * recadrage canvas (`cropImageToSquare`) avant l'envoi, qui produit un
 * `Blob` sans nom de fichier. */
const EXTENSIONS: Record<string, string> = {
  "image/webp": "webp",
  "image/png": "png",
};

/** L'extension suit le format réellement produit par la compression
 * (`compressCanvas` : WebP, ou JPEG en repli) plutôt qu'un ".jpg" figé. */
function withExtension(file: Blob, basename: string): string {
  return `${basename}.${EXTENSIONS[file.type] ?? "jpg"}`;
}

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
  return uploadImage(file, withExtension(file, "product-image"));
}

export function uploadShopLogo(file: Blob): Promise<string> {
  return uploadImage(file, withExtension(file, "shop-logo"), "manushop/shops");
}

export function uploadAvatar(file: Blob): Promise<string> {
  return uploadImage(file, withExtension(file, "avatar"), "manushop/users");
}

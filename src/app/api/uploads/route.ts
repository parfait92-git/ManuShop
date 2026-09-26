import { NextResponse } from "next/server";

import { cloudinary } from "@/lib/cloudinary";
import { verifyIdToken } from "@/lib/verifyIdToken";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Liste blanche plutôt qu'un dossier Cloudinary arbitraire fourni par le
// client — évite qu'un appelant écrive n'importe où dans le compte
// Cloudinary. Défaut "manushop/products" : rétrocompatible avec
// `uploadProductImage`, qui n'envoie jamais ce champ.
const ALLOWED_FOLDERS = ["manushop/products", "manushop/shops"] as const;
type AllowedFolder = (typeof ALLOWED_FOLDERS)[number];

function resolveFolder(value: FormDataEntryValue | null): AllowedFolder {
  return ALLOWED_FOLDERS.includes(value as AllowedFolder)
    ? (value as AllowedFolder)
    : "manushop/products";
}

export async function POST(request: Request) {
  const user = await verifyIdToken(request.headers.get("authorization"));
  if (!user) {
    return NextResponse.json(
      { error: "Authentification requise." },
      { status: 401 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Aucun fichier reçu." },
      { status: 400 }
    );
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Format d'image non supporté (JPEG, PNG ou WebP requis)." },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: "L'image dépasse la taille maximale autorisée (5 Mo)." },
      { status: 400 }
    );
  }

  const folder = resolveFolder(formData.get("folder"));
  const buffer = Buffer.from(await file.arrayBuffer());

  const result = await new Promise<{ secure_url: string }>(
    (resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ folder }, (error, uploaded) => {
          if (error || !uploaded) {
            reject(error ?? new Error("Échec de l'upload Cloudinary."));
            return;
          }
          resolve(uploaded as { secure_url: string });
        })
        .end(buffer);
    }
  );

  return NextResponse.json({ url: result.secure_url });
}

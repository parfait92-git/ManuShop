import { auth } from "@/lib/firebase";

export async function uploadProductImage(file: File): Promise<string> {
  if (!auth.currentUser) {
    throw new Error("Vous devez être connecté pour envoyer une image.");
  }
  const idToken = await auth.currentUser.getIdToken();

  const formData = new FormData();
  formData.append("file", file);

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

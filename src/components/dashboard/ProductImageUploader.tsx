"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { uploadProductImage } from "@/lib/upload";

export function ProductImageUploader({
  images,
  onChange,
}: {
  images: string[];
  onChange: (images: string[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);
    try {
      const uploaded = await Promise.all(
        Array.from(files).map((file) => uploadProductImage(file))
      );
      onChange([...images, ...uploaded]);
    } catch {
      setError("Échec de l'envoi d'une image. Réessayez.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeImage(url: string) {
    onChange(images.filter((image) => image !== url));
  }

  return (
    <div className="flex flex-col gap-3">
      {images.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {images.map((url) => (
            <div
              key={url}
              className="relative size-20 overflow-hidden rounded-lg border border-border"
            >
              <Image src={url} alt="" fill sizes="80px" className="object-cover" />
              <button
                type="button"
                onClick={() => removeImage(url)}
                aria-label="Retirer l'image"
                className="absolute top-0.5 right-0.5 rounded-full bg-background/80 p-0.5"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={handleFileChange}
        disabled={uploading}
        className="hidden"
        id="product-images"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="w-fit"
      >
        {uploading ? "Envoi en cours..." : "Ajouter des photos"}
      </Button>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

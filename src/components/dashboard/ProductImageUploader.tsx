"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { X } from "lucide-react";
import type { Area } from "react-easy-crop";

import { Button } from "@/components/ui/button";
import { ImageCropDialog } from "@/components/dashboard/ImageCropDialog";
import { cropImageToSquare } from "@/lib/imageCrop";
import { uploadProductImage } from "@/lib/upload";

export function ProductImageUploader({
  images,
  onChange,
}: {
  images: string[];
  onChange: (images: string[]) => void;
}) {
  // File d'attente d'object URLs à recadrer une par une avant l'envoi.
  const [queue, setQueue] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentImageSrc = queue[0] ?? null;

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setError(null);
    setQueue((current) => [
      ...current,
      ...Array.from(files).map((file) => URL.createObjectURL(file)),
    ]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function dequeue() {
    setQueue((current) => {
      const [done, ...rest] = current;
      if (done) URL.revokeObjectURL(done);
      return rest;
    });
  }

  async function handleCropConfirm(crop: Area) {
    if (!currentImageSrc) return;
    setUploading(true);
    setError(null);
    try {
      const blob = await cropImageToSquare(currentImageSrc, crop);
      const url = await uploadProductImage(blob);
      onChange([...images, url]);
    } catch {
      setError("Échec de l'envoi d'une image. Réessayez.");
    } finally {
      setUploading(false);
      dequeue();
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
        disabled={uploading || queue.length > 0}
        className="hidden"
        id="product-images"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading || queue.length > 0}
        onClick={() => inputRef.current?.click()}
        className="w-fit"
      >
        {uploading ? "Envoi en cours..." : "Ajouter des photos"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Chaque photo est recadrée au format carré avant l&apos;envoi, pour un
        catalogue uniforme.
      </p>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <ImageCropDialog
        key={currentImageSrc}
        imageSrc={currentImageSrc}
        onCancel={dequeue}
        onConfirm={handleCropConfirm}
      />
    </div>
  );
}

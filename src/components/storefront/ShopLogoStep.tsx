"use client";

import { ImagePlus } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import type { Area } from "react-easy-crop";

import { ImageCropDialog } from "@/components/dashboard/ImageCropDialog";
import { Input } from "@/components/ui/input";
import { LOGO_IMAGE_SIZE, cropImageToSquare } from "@/lib/imageCrop";
import { uploadShopLogo } from "@/lib/upload";

type LogoMode = "gallery" | "link";

/**
 * Étape 2 de l'assistant "Créer ma boutique" (BF-81). Miroir de
 * `ProductImageUploader` mais pour un logo unique (pas de file d'attente
 * multi-fichiers) avec bascule Galerie/Lien — voir la maquette reçue
 * (docs/design-prompts.txt, item 7).
 */
export function ShopLogoStep({
  mode,
  onModeChange,
  logoUrl,
  onLogoChange,
}: {
  mode: LogoMode;
  onModeChange: (mode: LogoMode) => void;
  logoUrl: string | undefined;
  onLogoChange: (url: string) => void;
}) {
  const [pendingImageSrc, setPendingImageSrc] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setPendingImageSrc(URL.createObjectURL(file));
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleCropConfirm(crop: Area) {
    if (!pendingImageSrc) return;
    setUploading(true);
    setError(null);
    try {
      const blob = await cropImageToSquare(pendingImageSrc, crop, LOGO_IMAGE_SIZE);
      const url = await uploadShopLogo(blob);
      onLogoChange(url);
    } catch {
      setError("Échec de l'envoi du logo. Réessayez.");
    } finally {
      setUploading(false);
      if (pendingImageSrc) URL.revokeObjectURL(pendingImageSrc);
      setPendingImageSrc(null);
    }
  }

  function handleCropCancel() {
    if (pendingImageSrc) URL.revokeObjectURL(pendingImageSrc);
    setPendingImageSrc(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-lg font-semibold">Ajoutez votre logo</h3>
        <p className="text-sm text-muted-foreground">
          Optionnel — vous pourrez l&apos;ajouter plus tard. Un logo aide vos
          clients à reconnaître votre boutique.
        </p>
      </div>

      <div className="grid grid-cols-2 rounded-lg border border-border p-1">
        <button
          type="button"
          onClick={() => onModeChange("gallery")}
          aria-pressed={mode === "gallery"}
          className={`rounded-md py-2 text-sm font-medium ${
            mode === "gallery" ? "bg-muted" : "text-muted-foreground"
          }`}
        >
          Galerie
        </button>
        <button
          type="button"
          onClick={() => onModeChange("link")}
          aria-pressed={mode === "link"}
          className={`rounded-md py-2 text-sm font-medium ${
            mode === "link" ? "bg-muted" : "text-muted-foreground"
          }`}
        >
          Lien
        </button>
      </div>

      {mode === "gallery" ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-8 text-center">
          {logoUrl ? (
            <div className="relative size-24 overflow-hidden rounded-full border border-border">
              <Image src={logoUrl} alt="" fill sizes="96px" className="object-cover" />
            </div>
          ) : (
            <ImagePlus className="size-8 text-muted-foreground" />
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
            id="shop-logo-file"
          />
          <label
            htmlFor="shop-logo-file"
            className="cursor-pointer text-sm font-semibold text-primary"
          >
            {uploading ? "Envoi en cours..." : "Déposez votre logo ici"}
          </label>
          <p className="text-xs text-muted-foreground">
            PNG ou JPG, carré de préférence
          </p>
        </div>
      ) : (
        <Input
          value={logoUrl ?? ""}
          onChange={(event) => onLogoChange(event.target.value)}
          placeholder="https://exemple.com/logo.png"
          aria-label="Lien du logo"
        />
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <ImageCropDialog
        key={pendingImageSrc}
        imageSrc={pendingImageSrc}
        onCancel={handleCropCancel}
        onConfirm={handleCropConfirm}
      />
    </div>
  );
}

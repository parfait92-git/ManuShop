"use client";

import { ImagePlus } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import type { Area } from "react-easy-crop";

import { ImageCropDialog } from "@/components/dashboard/ImageCropDialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  LOGO_IMAGE_SIZE,
  SMALL_IMAGE_MAX_BYTES,
  cropImageToSquare,
} from "@/lib/imageCrop";
import { uploadShopLogo } from "@/lib/upload";

type LogoMode = "gallery" | "link";

/**
 * Étape 2 de l'assistant "Créer ma boutique" (BF-81) — et réutilisé tel
 * quel dans `ShopSettingsForm` pour modifier le logo après la création
 * (jusque-là un simple champ URL, sans upload possible). Miroir de
 * `ProductImageUploader` mais pour un logo unique (pas de file d'attente
 * multi-fichiers) avec bascule Galerie/Lien — voir la maquette reçue
 * (docs/design-prompts.txt, item 7).
 */
export function ShopLogoStep({
  mode,
  onModeChange,
  logoUrl,
  onLogoChange,
  hideHeading,
}: {
  mode: LogoMode;
  onModeChange: (mode: LogoMode) => void;
  logoUrl: string | undefined;
  onLogoChange: (url: string) => void;
  /** `ShopSettingsForm` a déjà son propre titre de section ("Profil de la
   * boutique") juste au-dessus, et son texte d'aide ("vous pourrez
   * l'ajouter plus tard") n'a pas de sens hors du contexte de création. */
  hideHeading?: boolean;
}) {
  const [pendingImageSrc, setPendingImageSrc] = useState<string | null>(null);
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const uploading = busyLabel !== null;
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
    setBusyLabel("Compression du logo...");
    setError(null);
    try {
      const blob = await cropImageToSquare(
        pendingImageSrc,
        crop,
        LOGO_IMAGE_SIZE,
        SMALL_IMAGE_MAX_BYTES
      );
      setBusyLabel("Envoi du logo...");
      const url = await uploadShopLogo(blob);
      onLogoChange(url);
    } catch {
      setError("Échec de l'envoi du logo. Réessayez.");
    } finally {
      setBusyLabel(null);
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
      {!hideHeading && (
        <div>
          <h3 className="text-lg font-semibold">Ajoutez votre logo</h3>
          <p className="text-sm text-muted-foreground">
            Optionnel — vous pourrez l&apos;ajouter plus tard. Un logo aide
            vos clients à reconnaître votre boutique.
          </p>
        </div>
      )}

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
              {/* `unoptimized` : réutilisé depuis `ShopSettingsForm` pour
              modifier le logo d'une boutique déjà créée, `logoUrl` peut donc
              venir d'un lien externe collé à la main (mode "Lien"), pas
              seulement d'un upload Cloudinary — voir ShopSummaryCard/
              ProductDetailPageContent/StorefrontHeader pour le même
              contournement de l'allowlist de domaines de next/image. */}
              <Image
                src={logoUrl}
                alt=""
                fill
                sizes="96px"
                className="object-cover"
                unoptimized
              />
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
          />
          {/* Bouton + `inputRef.current?.click()` plutôt qu'un <label htmlFor>
          (le transfert de clic natif label→input est moins fiable une fois
          l'élément imbriqué dans le focus-trap d'un Dialog/Portal — voir
          06-journal-progression.md, "le sélecteur de galerie ne s'ouvrait pas
          dans l'assistant de création de boutique") : ce composant est
          toujours monté à l'intérieur de la boîte de dialogue
          `CreateShopWizard`. */}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading && <Spinner />}
            {uploading ? "Envoi en cours..." : "Déposez votre logo ici"}
          </button>
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
        busyLabel={busyLabel}
      />
    </div>
  );
}

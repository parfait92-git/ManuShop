"use client";

import { useState } from "react";
import Cropper, { type Area } from "react-easy-crop";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { DialogTour } from "@/components/onboarding/DialogTour";
import {
  Dialog,
  DialogDescription,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Le parent doit monter ce composant avec `key={imageSrc}` : c'est ce qui
 * réinitialise le crop/zoom d'une photo à l'autre dans une file d'attente,
 * en remontant le composant plutôt qu'en synchronisant un `useEffect`.
 */
export function ImageCropDialog({
  imageSrc,
  onCancel,
  onConfirm,
  busyLabel,
}: {
  /** `null` ferme le dialogue (contrôlé par le parent, une image à la fois). */
  imageSrc: string | null;
  onCancel: () => void;
  onConfirm: (crop: Area) => void;
  /** Étape en cours après validation ("Compression...", "Envoi..."). Tant
   * qu'il est renseigné, le dialogue reste ouvert avec un indicateur de
   * chargement et ne peut être ni validé une 2ᵉ fois (double envoi) ni
   * fermé (le parent ferme lui-même une fois le traitement terminé). */
  busyLabel?: string | null;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  // Une photo de téléphone de plusieurs Mo met un moment à se décoder.
  const [mediaLoaded, setMediaLoaded] = useState(false);

  const busy = Boolean(busyLabel);
  const overlayLabel = busyLabel ?? (mediaLoaded ? null : "Chargement de la photo...");

  function handleOpenChange(open: boolean) {
    if (!open && !busy) onCancel();
  }

  function handleConfirm() {
    if (croppedAreaPixels && !busy) onConfirm(croppedAreaPixels);
  }

  return (
    <Dialog open={imageSrc !== null} onOpenChange={handleOpenChange}>
      <DialogPortal className="max-w-md">
        <div className="flex items-start justify-between gap-3">
          <DialogTitle>Recadrer la photo</DialogTitle>
          <DialogTour tourId="dialog-image-crop" />
        </div>
        <DialogDescription>
          Ajustez le cadrage et le zoom. La photo sera enregistrée au format
          carré, comme elle apparaîtra dans le catalogue.
        </DialogDescription>

        <div data-tour="crop-area" className="relative h-72 w-full overflow-hidden rounded-lg bg-muted">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="rect"
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
              onMediaLoaded={() => setMediaLoaded(true)}
            />
          )}
          {overlayLabel && (
            <div
              role="status"
              className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-background/70 text-sm font-medium backdrop-blur-sm"
            >
              <Spinner className="size-6 text-primary" />
              {overlayLabel}
            </div>
          )}
        </div>

        <div data-tour="crop-zoom" className="flex items-center gap-3">
          <label htmlFor="crop-zoom" className="text-sm text-muted-foreground">
            Zoom
          </label>
          <input
            id="crop-zoom"
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            disabled={busy}
            className="flex-1"
          />
        </div>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={busy}
          >
            Annuler
          </Button>
          <Button
            data-tour="crop-confirm"
            type="button"
            onClick={handleConfirm}
            disabled={busy || !mediaLoaded}
          >
            {busy && <Spinner />}
            {busy ? "Traitement..." : "Valider le recadrage"}
          </Button>
        </div>
      </DialogPortal>
    </Dialog>
  );
}

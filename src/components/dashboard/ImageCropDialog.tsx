"use client";

import { useState } from "react";
import Cropper, { type Area } from "react-easy-crop";

import { Button } from "@/components/ui/button";
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
}: {
  /** `null` ferme le dialogue (contrôlé par le parent, une image à la fois). */
  imageSrc: string | null;
  onCancel: () => void;
  onConfirm: (crop: Area) => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  function handleOpenChange(open: boolean) {
    if (!open) onCancel();
  }

  function handleConfirm() {
    if (croppedAreaPixels) onConfirm(croppedAreaPixels);
  }

  return (
    <Dialog open={imageSrc !== null} onOpenChange={handleOpenChange}>
      <DialogPortal className="max-w-md">
        <DialogTitle>Recadrer la photo</DialogTitle>
        <DialogDescription>
          Ajustez le cadrage et le zoom. La photo sera enregistrée au format
          carré, comme elle apparaîtra dans le catalogue.
        </DialogDescription>

        <div className="relative h-72 w-full overflow-hidden rounded-lg bg-muted">
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
            />
          )}
        </div>

        <div className="flex items-center gap-3">
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
            className="flex-1"
          />
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button type="button" onClick={handleConfirm}>
            Valider le recadrage
          </Button>
        </div>
      </DialogPortal>
    </Dialog>
  );
}

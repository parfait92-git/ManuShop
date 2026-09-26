"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";

export type ReasonKind = "cancel" | "returned" | "defective";

export interface ReasonTarget {
  orderId: string;
  kind: ReasonKind;
}

const COPY: Record<ReasonKind, { title: string; description: string; confirmLabel: string }> = {
  cancel: {
    title: "Annuler la commande",
    description: "Le motif est requis (BF-23) — visible par le client.",
    confirmLabel: "Annuler la commande",
  },
  returned: {
    title: "Marquer comme retournée",
    description:
      "Le motif est requis (BF-96) — le stock des articles sera automatiquement réincrémenté.",
    confirmLabel: "Confirmer le retour",
  },
  defective: {
    title: "Marquer comme défectueuse",
    description:
      "Le motif est requis (BF-97) — le stock des articles sera automatiquement réincrémenté.",
    confirmLabel: "Confirmer",
  },
};

/** Dialogue générique de motif obligatoire, partagé entre annulation
 * (BF-23) et retour/défectueux (BF-96/97) — même structure contrôlée que
 * `CountdownDialog`/`ImageCropDialog` (une cible à la fois, `key` pour
 * réinitialiser l'état entre deux cibles). */
export function OrderReasonDialog({
  target,
  onCancel,
  onConfirm,
}: {
  target: ReasonTarget | null;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const copy = target ? COPY[target.kind] : null;

  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onCancel()}>
      <DialogPortal className="max-w-sm">
        {copy && (
          <>
            <DialogTitle>{copy.title}</DialogTitle>
            <DialogDescription>{copy.description}</DialogDescription>
          </>
        )}
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={3}
          placeholder="Motif..."
          className="w-full resize-none rounded-lg border border-border bg-background p-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring"
        />
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Retour
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!reason.trim()}
            onClick={() => onConfirm(reason.trim())}
          >
            {copy?.confirmLabel}
          </Button>
        </div>
      </DialogPortal>
    </Dialog>
  );
}

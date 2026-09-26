"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { activityLogService } from "@/services/ActivityLogService";
import { categoryTrashService, productTrashService } from "@/services/TrashService";

interface TrashRow {
  id: string;
  type: "product" | "category";
  typeLabel: string;
  name: string;
  deletedAt: Date;
}

const COUNTDOWN_SECONDS = 5;

function CountdownDialog({
  row,
  onCancel,
  onConfirm,
}: {
  row: TrashRow | null;
  onCancel: () => void;
  onConfirm: (row: TrashRow) => void;
}) {
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);

  useEffect(() => {
    if (!row) return;
    // Deferred to a microtask so setState runs in a callback rather than
    // synchronously in the effect body (see ScrollReveal.tsx).
    queueMicrotask(() => setSecondsLeft(COUNTDOWN_SECONDS));
    const interval = setInterval(() => {
      setSecondsLeft((current) => Math.max(0, current - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [row]);

  useEffect(() => {
    if (row && secondsLeft === 0) {
      onConfirm(row);
    }
  }, [secondsLeft, row, onConfirm]);

  const progress = row ? (secondsLeft / COUNTDOWN_SECONDS) * 100 : 0;

  return (
    <Dialog open={!!row} onOpenChange={(open) => !open && onCancel()}>
      <DialogPortal className="max-w-sm">
        <DialogTitle>Suppression définitive</DialogTitle>
        <DialogDescription>
          {row && (
            <>
              « {row.name} » sera supprimé définitivement dans {secondsLeft}s.
              Cette action est irréversible.
            </>
          )}
        </DialogDescription>
        <div
          className="relative mx-auto my-4 flex size-20 items-center justify-center rounded-full"
          style={{
            background: `conic-gradient(var(--color-destructive) ${progress}%, var(--color-muted) ${progress}%)`,
          }}
        >
          <div className="flex size-16 items-center justify-center rounded-full bg-background text-lg font-semibold">
            {secondsLeft}
          </div>
        </div>
        <Button onClick={onCancel} className="w-full" variant="outline">
          Annuler
        </Button>
      </DialogPortal>
    </Dialog>
  );
}

/** Corbeille (BF-99/100) : fusionne les corbeilles produits et catégories
 * (`TrashService` générique, `src/services/TrashService.ts`). */
export function TrashPageContent({ shopId }: { shopId: string }) {
  const { profile } = useAuth();
  const [rows, setRows] = useState<TrashRow[] | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [purgeTarget, setPurgeTarget] = useState<TrashRow | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      productTrashService.listTrashed(shopId),
      categoryTrashService.listTrashed(shopId),
    ]).then(([products, categories]) => {
      if (!active) return;
      const merged: TrashRow[] = [
        ...products.map((p) => ({
          id: p.id,
          type: "product" as const,
          typeLabel: "Produit",
          name: p.name,
          deletedAt: p.deletedAt!.toDate(),
        })),
        ...categories.map((c) => ({
          id: c.id,
          type: "category" as const,
          typeLabel: "Catégorie",
          name: c.name,
          deletedAt: c.deletedAt!.toDate(),
        })),
      ].sort((a, b) => b.deletedAt.getTime() - a.deletedAt.getTime());
      setRows(merged);
    });
    return () => {
      active = false;
    };
  }, [shopId]);

  async function handleRestore(row: TrashRow) {
    setRestoringId(row.id);
    try {
      const service = row.type === "product" ? productTrashService : categoryTrashService;
      await service.restore(row.id);
      if (profile) {
        const context = { shopId, actorId: profile.id, actorName: profile.displayName };
        if (row.type === "product") {
          await activityLogService.logProductRestored(context, row.id, row.name);
        } else {
          await activityLogService.logCategoryRestored(context, row.id, row.name);
        }
      }
      setRows((current) => current?.filter((r) => r.id !== row.id) ?? null);
      toast.success(`« ${row.name} » restauré.`);
    } finally {
      setRestoringId(null);
    }
  }

  async function handlePurgeConfirmed(row: TrashRow) {
    setPurgeTarget(null);
    const service = row.type === "product" ? productTrashService : categoryTrashService;
    await service.purge(row.id);
    setRows((current) => current?.filter((r) => r.id !== row.id) ?? null);
    toast.success(`« ${row.name} » supprimé définitivement.`);
  }

  if (rows === null) {
    return <p className="text-sm text-muted-foreground">Chargement...</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
          Corbeille
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Restaurez un élément ou supprimez-le définitivement.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
            <Trash2 className="size-8 text-slate-300" />
            <p className="text-sm text-slate-500">La corbeille est vide.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((row) => (
              <li
                key={`${row.type}-${row.id}`}
                className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6"
              >
                <p className="text-sm text-slate-700">
                  {row.typeLabel} · {row.name} ·{" "}
                  {row.deletedAt.toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={restoringId === row.id}
                    onClick={() => handleRestore(row)}
                  >
                    ↺ Restaurer
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setPurgeTarget(row)}
                  >
                    Supprimer définitivement
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <CountdownDialog
        row={purgeTarget}
        onCancel={() => setPurgeTarget(null)}
        onConfirm={handlePurgeConfirmed}
      />
    </div>
  );
}

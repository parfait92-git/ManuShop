"use client";

import { useState } from "react";

import { toLocalInput } from "@/components/dashboard/promotions/PromotionDialog";
import { DialogTour } from "@/components/onboarding/DialogTour";
import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CODE_PATTERN, codeDiscount, normalizeCode } from "@/lib/promoCode";
import type { PromotionKind } from "@/models/promotion/Promotion";
import type { PromoCode } from "@/models/promotion/PromoCode";
import type { PromoCodeInput } from "@/server/actions/promoCodeActions";

export interface PromoCodeDraft {
  id?: string;
  code: string;
  kind: PromotionKind;
  value: string;
  /** Champs vides : aucune condition. */
  minSubtotal: string;
  maxUses: string;
  perClient: string;
  startsAt: string;
  endsAt: string;
}

/** Brouillon d'un code existant, ou d'un nouveau (dès maintenant, pour
 * 30 jours, une fois par client). */
export function codeDraftFrom(code?: PromoCode, now: Date = new Date()): PromoCodeDraft {
  if (code) {
    return {
      id: code.id,
      code: code.code,
      kind: code.kind,
      value: String(code.value),
      minSubtotal: code.minSubtotal ? String(code.minSubtotal) : "",
      maxUses: code.maxUses === null ? "" : String(code.maxUses),
      perClient: code.perClient === null ? "" : String(code.perClient),
      startsAt: toLocalInput(code.startsAt.toDate()),
      endsAt: toLocalInput(code.endsAt.toDate()),
    };
  }
  const start = new Date(now);
  start.setSeconds(0, 0);
  const end = new Date(start.getTime() + 30 * 24 * 3600 * 1000);
  end.setHours(23, 59, 0, 0);
  return {
    code: "",
    kind: "percent",
    value: "",
    minSubtotal: "",
    maxUses: "",
    perClient: "1",
    startsAt: toLocalInput(start),
    endsAt: toLocalInput(end),
  };
}

const orNull = (value: string) => (value.trim() ? Number(value) : null);

export function codeToInput(draft: PromoCodeDraft): PromoCodeInput {
  return {
    ...(draft.id ? { id: draft.id } : {}),
    code: normalizeCode(draft.code),
    kind: draft.kind,
    value: Number(draft.value),
    minSubtotal: Number(draft.minSubtotal || 0),
    maxUses: orNull(draft.maxUses),
    perClient: orNull(draft.perClient),
    startsAt: new Date(draft.startsAt).toISOString(),
    endsAt: new Date(draft.endsAt).toISOString(),
  };
}

/**
 * Création ou modification d'un code promo (BF-32, 2026-10-12) : le code,
 * la réduction sur la commande, ses conditions (montant minimum, nombre
 * d'utilisations, par client) et ses dates.
 */
export function PromoCodeDialog({
  draft,
  onClose,
  onSave,
}: {
  draft: PromoCodeDraft | null;
  onClose: () => void;
  onSave: (draft: PromoCodeDraft) => Promise<void>;
}) {
  return (
    <Dialog open={!!draft} onOpenChange={(open) => !open && onClose()}>
      <DialogPortal className="max-w-xl">{draft && <PromoCodeForm key={draft.id ?? "new"} initial={draft} onSave={onSave} />}</DialogPortal>
    </Dialog>
  );
}

const digits = (value: string) => value.replace(/\D/g, "");

function PromoCodeForm({ initial, onSave }: { initial: PromoCodeDraft; onSave: (draft: PromoCodeDraft) => Promise<void> }) {
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<PromoCodeDraft>) => setDraft((d) => ({ ...d, ...patch }));

  const code = normalizeCode(draft.code);
  const codeOk = !!draft.id || CODE_PATTERN.test(code);
  const value = Number(draft.value);
  const valueOk = draft.kind === "percent" ? Number.isInteger(value) && value >= 1 && value <= 90 : Number.isInteger(value) && value >= 1;
  const limitOk = (v: string) => !v.trim() || Number(v) >= 1;
  const datesOk = !!draft.startsAt && !!draft.endsAt && new Date(draft.endsAt) > new Date(draft.startsAt);
  const canSave = codeOk && valueOk && limitOk(draft.maxUses) && limitOk(draft.perClient) && datesOk && !saving;
  const minimum = Number(draft.minSubtotal || 0);
  const exampleSubtotal = Math.max(minimum, 10000);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(draft);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Le code n'a pas pu être enregistré.");
    } finally {
      setSaving(false);
    }
  }

  const field = "flex flex-col gap-1.5";
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <DialogTitle>{draft.id ? `Modifier le code ${draft.code}` : "Nouveau code promo"}</DialogTitle>
          <DialogDescription>Le client le saisit en commandant : la réduction porte sur le montant de sa commande.</DialogDescription>
        </div>
        <DialogTour tourId="dialog-promo-code" />
      </div>

      {!draft.id && (
        <div className={field}>
          <Label htmlFor="code-text" help="3 à 20 lettres, chiffres ou tirets. Il ne change plus une fois créé.">
            Code
          </Label>
          <Input
            id="code-text"
            data-tour="code-text"
            value={draft.code}
            maxLength={24}
            onChange={(e) => set({ code: e.target.value })}
            placeholder="Ex. RENTREE10"
            autoCapitalize="characters"
            autoComplete="off"
            className="uppercase"
            aria-invalid={!!draft.code && !codeOk}
          />
          {draft.code && code !== draft.code && codeOk && <p className="text-xs text-muted-foreground">Enregistré comme {code}</p>}
        </div>
      )}

      <div data-tour="code-value" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className={field}>
          <Label htmlFor="code-kind">Type de réduction</Label>
          <div id="code-kind" role="radiogroup" aria-label="Type de réduction" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
            {(["percent", "amount"] as const).map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={draft.kind === k}
                onClick={() => set({ kind: k })}
                className={`rounded-md px-2 py-1.5 text-sm ${draft.kind === k ? "bg-background font-medium shadow-sm" : "text-muted-foreground"}`}
              >
                {k === "percent" ? "Pourcentage" : "Montant"}
              </button>
            ))}
          </div>
        </div>
        <div className={field}>
          <Label htmlFor="code-value" help={draft.kind === "percent" ? "Entre 1 et 90 % du montant des articles." : "Retiré du montant de la commande, en FCFA."}>
            {draft.kind === "percent" ? "Réduction (%)" : "Réduction (FCFA)"}
          </Label>
          <Input
            id="code-value"
            inputMode="numeric"
            value={draft.value}
            onChange={(e) => set({ value: digits(e.target.value) })}
            placeholder={draft.kind === "percent" ? "Ex. 10" : "Ex. 2000"}
            aria-invalid={!!draft.value && !valueOk}
          />
        </div>
      </div>

      <div data-tour="code-limits" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className={field}>
          <Label htmlFor="code-min" help="Montant des articles à atteindre pour utiliser le code. Vide : aucun minimum.">
            Achat minimum (FCFA)
          </Label>
          <Input id="code-min" inputMode="numeric" value={draft.minSubtotal} onChange={(e) => set({ minSubtotal: digits(e.target.value) })} placeholder="Aucun" />
        </div>
        <div className={field}>
          <Label htmlFor="code-max" help="Nombre de commandes au total, tous clients confondus. Vide : illimité.">
            Utilisations
          </Label>
          <Input
            id="code-max"
            inputMode="numeric"
            value={draft.maxUses}
            onChange={(e) => set({ maxUses: digits(e.target.value) })}
            placeholder="Illimitées"
            aria-invalid={!limitOk(draft.maxUses)}
          />
        </div>
        <div className={field}>
          <Label htmlFor="code-per-client" help="Combien de fois un même client peut s'en servir. Vide : sans limite.">
            Par client
          </Label>
          <Input
            id="code-per-client"
            inputMode="numeric"
            value={draft.perClient}
            onChange={(e) => set({ perClient: digits(e.target.value) })}
            placeholder="Sans limite"
            aria-invalid={!limitOk(draft.perClient)}
          />
        </div>
      </div>

      <div data-tour="code-dates" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className={field}>
          <Label htmlFor="code-start" help="À votre heure locale.">
            Valable à partir du
          </Label>
          <Input id="code-start" type="datetime-local" value={draft.startsAt} onChange={(e) => set({ startsAt: e.target.value })} />
        </div>
        <div className={field}>
          <Label htmlFor="code-end" help="Le code ne fonctionne plus après cette heure.">
            Jusqu&apos;au
          </Label>
          <Input
            id="code-end"
            type="datetime-local"
            value={draft.endsAt}
            onChange={(e) => set({ endsAt: e.target.value })}
            aria-invalid={!!draft.endsAt && !datesOk}
          />
        </div>
      </div>

      {valueOk && (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm">
          Exemple : une commande de <span className="font-medium">{exampleSubtotal.toLocaleString("fr-FR")} FCFA</span> passe à{" "}
          <span className="font-semibold">
            {(exampleSubtotal - codeDiscount({ kind: draft.kind, value }, exampleSubtotal)).toLocaleString("fr-FR")} FCFA
          </span>
          .
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" data-tour="code-save" disabled={!canSave} className="self-end">
        {saving ? "Enregistrement..." : draft.id ? "Enregistrer les modifications" : "Créer le code"}
      </Button>
    </form>
  );
}

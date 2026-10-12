"use client";

import { useMemo, useState } from "react";

import { DialogTour } from "@/components/onboarding/DialogTour";
import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { applyDiscount } from "@/lib/pricing";
import type { Category } from "@/models/category/Category";
import type { Product } from "@/models/product/Product";
import type { Promotion, PromotionKind, PromotionTarget } from "@/models/promotion/Promotion";
import type { PromotionInput } from "@/server/actions/promotionActions";

type TargetType = PromotionTarget["type"];

const pad = (n: number) => String(n).padStart(2, "0");
/** Date → valeur d'un champ `datetime-local`, à l'heure de l'appareil. */
function toLocalInput(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export interface PromotionDraft {
  id?: string;
  title: string;
  kind: PromotionKind;
  value: string;
  targetType: TargetType;
  categories: string[];
  productIds: string[];
  startsAt: string;
  endsAt: string;
  flash: boolean;
}

/** Brouillon d'une campagne existante, ou d'une nouvelle (dès maintenant,
 * pour 7 jours). */
export function draftFrom(promotion?: Promotion, now: Date = new Date()): PromotionDraft {
  if (promotion) {
    return {
      id: promotion.id,
      title: promotion.title,
      kind: promotion.kind,
      value: String(promotion.value),
      targetType: promotion.target.type,
      categories: promotion.target.type === "categories" ? promotion.target.categories : [],
      productIds: promotion.target.type === "products" ? promotion.target.productIds : [],
      startsAt: toLocalInput(promotion.startsAt.toDate()),
      endsAt: toLocalInput(promotion.endsAt.toDate()),
      flash: promotion.flash,
    };
  }
  const start = new Date(now);
  start.setSeconds(0, 0);
  const end = new Date(start.getTime() + 7 * 24 * 3600 * 1000);
  end.setHours(23, 59, 0, 0);
  return {
    title: "",
    kind: "percent",
    value: "",
    targetType: "shop",
    categories: [],
    productIds: [],
    startsAt: toLocalInput(start),
    endsAt: toLocalInput(end),
    flash: false,
  };
}

/** Brouillon → données de l'action serveur (instants ISO). */
export function toInput(draft: PromotionDraft): PromotionInput {
  const target: PromotionTarget =
    draft.targetType === "categories"
      ? { type: "categories", categories: draft.categories }
      : draft.targetType === "products"
        ? { type: "products", productIds: draft.productIds }
        : { type: "shop" };
  return {
    ...(draft.id ? { id: draft.id } : {}),
    title: draft.title.trim(),
    kind: draft.kind,
    value: Number(draft.value),
    target,
    startsAt: new Date(draft.startsAt).toISOString(),
    endsAt: new Date(draft.endsAt).toISOString(),
    flash: draft.flash,
  };
}

const TARGETS: { id: TargetType; label: string }[] = [
  { id: "shop", label: "Toute la boutique" },
  { id: "categories", label: "Des catégories" },
  { id: "products", label: "Des articles" },
];

/**
 * Création ou modification d'une campagne de promotion (BF-30→33,
 * 2026-10-12) : nom, réduction (% ou montant), cible, dates, vente flash ;
 * aperçu du prix sur un article concerné.
 */
export function PromotionDialog({
  draft,
  onClose,
  onSave,
  categories,
  products,
}: {
  draft: PromotionDraft | null;
  onClose: () => void;
  onSave: (draft: PromotionDraft) => Promise<void>;
  categories: Category[];
  products: Product[];
}) {
  return (
    <Dialog open={!!draft} onOpenChange={(open) => !open && onClose()}>
      <DialogPortal className="max-w-xl">
        {draft && <PromotionForm key={draft.id ?? "new"} initial={draft} onSave={onSave} categories={categories} products={products} />}
      </DialogPortal>
    </Dialog>
  );
}

function PromotionForm({
  initial,
  onSave,
  categories,
  products,
}: {
  initial: PromotionDraft;
  onSave: (draft: PromotionDraft) => Promise<void>;
  categories: Category[];
  products: Product[];
}) {
  const [draft, setDraft] = useState(initial);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<PromotionDraft>) => setDraft((d) => ({ ...d, ...patch }));

  const value = Number(draft.value);
  const valueOk = draft.kind === "percent" ? Number.isInteger(value) && value >= 1 && value <= 90 : Number.isInteger(value) && value >= 1;
  const targetOk =
    draft.targetType === "shop" ||
    (draft.targetType === "categories" && draft.categories.length > 0) ||
    (draft.targetType === "products" && draft.productIds.length > 0);
  const datesOk = !!draft.startsAt && !!draft.endsAt && new Date(draft.endsAt) > new Date(draft.startsAt);
  const canSave = !!draft.title.trim() && valueOk && targetOk && datesOk && !saving;

  // Aperçu : le premier article concerné.
  const example = useMemo(() => {
    const concerned = products.filter((p) =>
      draft.targetType === "shop"
        ? true
        : draft.targetType === "categories"
          ? draft.categories.includes(p.category)
          : draft.productIds.includes(p.id)
    );
    return concerned[0];
  }, [products, draft.targetType, draft.categories, draft.productIds]);

  const visibleProducts = products.filter((p) => p.name.toLowerCase().includes(search.trim().toLowerCase()));
  const toggle = (list: string[], item: string) => (list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(draft);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "La promotion n'a pas pu être enregistrée.");
    } finally {
      setSaving(false);
    }
  }

  const field = "flex flex-col gap-1.5";
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <DialogTitle>{draft.id ? "Modifier la promotion" : "Nouvelle promotion"}</DialogTitle>
          <DialogDescription>La réduction s&apos;applique d&apos;elle-même, sans code, pendant ses dates.</DialogDescription>
        </div>
        <DialogTour tourId="dialog-promotion" />
      </div>

      <div className={field}>
        <Label htmlFor="promo-title" help="Affiché aux clients sur la boutique et la fiche des articles, ex. « Soldes de la rentrée ».">
          Nom de la promotion
        </Label>
        <Input
          id="promo-title"
          data-tour="promo-title"
          value={draft.title}
          maxLength={60}
          onChange={(e) => set({ title: e.target.value })}
          placeholder="Ex. Soldes de la rentrée"
        />
      </div>

      <div data-tour="promo-value" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className={field}>
          <Label htmlFor="promo-kind">Type de réduction</Label>
          <div id="promo-kind" role="radiogroup" aria-label="Type de réduction" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
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
          <Label htmlFor="promo-value" help={draft.kind === "percent" ? "Entre 1 et 90 %." : "Retiré du prix de chaque article, en FCFA."}>
            {draft.kind === "percent" ? "Réduction (%)" : "Réduction (FCFA)"}
          </Label>
          <Input
            id="promo-value"
            inputMode="numeric"
            value={draft.value}
            onChange={(e) => set({ value: e.target.value.replace(/\D/g, "") })}
            placeholder={draft.kind === "percent" ? "Ex. 20" : "Ex. 1000"}
            aria-invalid={!!draft.value && !valueOk}
          />
        </div>
      </div>

      <div data-tour="promo-target" className={field}>
        <Label htmlFor="promo-target">S&apos;applique à</Label>
        <div id="promo-target" role="radiogroup" aria-label="S'applique à" className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
          {TARGETS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={draft.targetType === t.id}
              onClick={() => set({ targetType: t.id })}
              className={`rounded-md px-2 py-1.5 text-xs sm:text-sm ${draft.targetType === t.id ? "bg-background font-medium shadow-sm" : "text-muted-foreground"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {draft.targetType === "categories" && (
          <div className="flex flex-wrap gap-2 pt-1">
            {categories.map((c) => (
              <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-full border border-border px-3 py-1 text-sm has-checked:border-primary has-checked:bg-primary/5">
                <input
                  type="checkbox"
                  className="accent-current"
                  checked={draft.categories.includes(c.name)}
                  onChange={() => set({ categories: toggle(draft.categories, c.name) })}
                />
                {c.name}
              </label>
            ))}
          </div>
        )}
        {draft.targetType === "products" && (
          <div className="flex flex-col gap-2 pt-1">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un article" aria-label="Rechercher un article" />
            <div className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-lg border border-border p-2">
              {visibleProducts.map((p) => (
                <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted">
                  <input type="checkbox" checked={draft.productIds.includes(p.id)} onChange={() => set({ productIds: toggle(draft.productIds, p.id) })} />
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{p.price.toLocaleString("fr-FR")} FCFA</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{draft.productIds.length} article(s) choisi(s)</p>
          </div>
        )}
      </div>

      <div data-tour="promo-dates" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className={field}>
          <Label htmlFor="promo-start" help="À votre heure locale. Laissez maintenant pour commencer tout de suite.">
            Début
          </Label>
          <Input id="promo-start" type="datetime-local" value={draft.startsAt} onChange={(e) => set({ startsAt: e.target.value })} />
        </div>
        <div className={field}>
          <Label htmlFor="promo-end" help="La promotion s'arrête d'elle-même à cette heure.">
            Fin
          </Label>
          <Input
            id="promo-end"
            type="datetime-local"
            value={draft.endsAt}
            onChange={(e) => set({ endsAt: e.target.value })}
            aria-invalid={!!draft.endsAt && !datesOk}
          />
        </div>
      </div>

      <div data-tour="promo-flash" className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
        <Label
          htmlFor="promo-flash"
          help="Une vente courte (7 jours au plus) mise en avant : bandeau rouge et compte à rebours sur votre boutique et sur la fiche des articles."
        >
          Vente flash, avec compte à rebours
        </Label>
        <Switch
          id="promo-flash"
          checked={draft.flash}
          onCheckedChange={(flash) => {
            // Une vente flash dure 7 jours au plus : si la durée choisie
            // dépasse, la fin est ramenée à 24 heures après le début.
            const start = new Date(draft.startsAt);
            const tooLong = new Date(draft.endsAt).getTime() - start.getTime() > 7 * 24 * 3600 * 1000;
            set(flash && tooLong && !Number.isNaN(start.getTime()) ? { flash, endsAt: toLocalInput(new Date(start.getTime() + 24 * 3600 * 1000)) } : { flash });
          }}
        />
      </div>

      {example && valueOk && (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm">
          Exemple : <span className="font-medium">{example.name}</span> passe de{" "}
          <span className="line-through">{example.price.toLocaleString("fr-FR")} FCFA</span> à{" "}
          <span className="font-semibold">{applyDiscount(example.price, draft.kind, value).toLocaleString("fr-FR")} FCFA</span>.
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" data-tour="promo-save" disabled={!canSave} className="self-end">
        {saving ? "Enregistrement..." : draft.id ? "Enregistrer les modifications" : "Créer la promotion"}
      </Button>
    </form>
  );
}

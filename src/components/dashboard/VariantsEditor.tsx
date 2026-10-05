"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { listVariants } from "@/lib/variants";
import type { Product } from "@/models/product/Product";
import type { ProductVariant } from "@/models/product/ProductVariant";

/** Une ligne du tableau des versions, telle que saisie. */
export interface VariantRow {
  /** Clé locale (affichage) ; `id` pour une version déjà enregistrée. */
  key: string;
  id?: string;
  label: string;
  price: string;
  /** Stock de départ (nouvelle version) ; stock actuel pour une existante. */
  stock: string;
}

export interface VariantsState {
  enabled: boolean;
  name: string;
  rows: VariantRow[];
}

const SUGGESTIONS = ["Contenance", "Taille", "Couleur", "Parfum", "Poids", "Pointure", "Modèle"];

let counter = 0;
const newKey = () => `nv-${Date.now().toString(36)}-${counter++}`;

export function emptyRow(): VariantRow {
  return { key: newKey(), label: "", price: "", stock: "" };
}

/** État de départ du formulaire, depuis le produit enregistré. */
export function variantsStateFrom(product?: Product): VariantsState {
  const variants = product ? listVariants(product) : [];
  return {
    enabled: variants.length > 0,
    name: product?.variantName ?? "",
    rows: variants.map((v) => ({
      key: v.id,
      id: v.id,
      label: v.label,
      price: v.price === undefined ? "" : String(v.price),
      stock: String(v.stock),
    })),
  };
}

const wholeNumber = (value: string) => /^\d+$/.test(value.trim());
const parsePrice = (value: string) => Number(value.replace(/\s/g, "").replace(",", "."));

/** Erreur de saisie, ou `null` si les versions sont valides. */
export function validateVariants(state: VariantsState): string | null {
  if (!state.enabled) return null;
  if (!state.name.trim()) return "Indiquez ce qui distingue les versions (ex. Contenance, Taille).";
  if (state.rows.length < 2) return "Ajoutez au moins deux versions (sinon, laissez l'option désactivée).";
  const labels = state.rows.map((r) => r.label.trim().toLowerCase());
  if (labels.some((l) => !l)) return "Chaque version a besoin d'un nom.";
  if (new Set(labels).size !== labels.length) return "Deux versions portent le même nom.";
  for (const row of state.rows) {
    if (row.price.trim() && !(parsePrice(row.price) > 0)) return `Le prix de « ${row.label.trim()} » doit être un montant positif.`;
    if (!row.id && !wholeNumber(row.stock || "0")) return `Le stock de « ${row.label.trim()} » doit être un nombre entier.`;
  }
  return null;
}

/** Versions prêtes à enregistrer (création d'un produit). */
export function toVariantMap(state: VariantsState, makeId: () => string): Record<string, ProductVariant> {
  return Object.fromEntries(
    state.rows.map((row, position) => [
      row.id ?? makeId(),
      {
        label: row.label.trim(),
        stock: Number(row.stock || 0),
        position,
        ...(row.price.trim() ? { price: parsePrice(row.price) } : {}),
      },
    ])
  );
}

/** Versions à envoyer au serveur (produit existant). */
export function toDrafts(state: VariantsState) {
  if (!state.enabled) return [];
  return state.rows.map((row) => ({
    ...(row.id ? { id: row.id } : { stock: Number(row.stock || 0) }),
    label: row.label.trim(),
    ...(row.price.trim() ? { price: parsePrice(row.price) } : {}),
  }));
}

export function totalRowsStock(state: VariantsState): number {
  return state.rows.reduce((sum, row) => sum + (wholeNumber(row.stock || "0") ? Number(row.stock || 0) : 0), 0);
}

/**
 * Versions d'un produit (BF-17, 2026-10-04) dans le formulaire : l'option
 * qui les distingue (« Contenance ») et une ligne par version — nom, prix
 * propre facultatif, stock. À la création, le stock de chaque version est
 * saisi ici ; ensuite, il se gère dans la fenêtre Stock (tracé), et seul le
 * stock de départ d'une nouvelle version se saisit ici.
 */
export function VariantsEditor({
  value,
  onChange,
  basePrice,
  editing,
  error,
}: {
  value: VariantsState;
  onChange: (next: VariantsState) => void;
  /** Prix de l'article, rappelé dans les prix laissés vides. */
  basePrice?: number;
  /** Produit existant : stock des versions enregistrées en lecture seule. */
  editing: boolean;
  error?: string | null;
}) {
  const update = (key: string, patch: Partial<VariantRow>) =>
    onChange({ ...value, rows: value.rows.map((r) => (r.key === key ? { ...r, ...patch } : r)) });

  return (
    <div data-tour="product-variants" className="flex flex-col gap-3 rounded-lg border border-border p-3">
      <div className="flex items-center justify-between gap-3">
        <Label
          htmlFor="variants-enabled"
          help="Pour un article vendu en plusieurs tailles, couleurs, contenances ou parfums : chaque version a son propre stock et, si besoin, son propre prix. Le client choisit sa version avant d'ajouter l'article au panier."
        >
          Cet article existe en plusieurs versions
        </Label>
        <Switch
          id="variants-enabled"
          checked={value.enabled}
          onCheckedChange={(enabled) =>
            onChange({
              ...value,
              enabled,
              rows: enabled && value.rows.length === 0 ? [emptyRow(), emptyRow()] : value.rows,
            })
          }
        />
      </div>

      {value.enabled && (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="variant-name" help="Ce qui distingue les versions, affiché au client : « Contenance : 250 ml, 500 ml ».">
              Les versions diffèrent par
            </Label>
            <Input
              id="variant-name"
              list="variant-name-suggestions"
              value={value.name}
              onChange={(e) => onChange({ ...value, name: e.target.value })}
              placeholder="Ex. Contenance"
              maxLength={40}
            />
            <datalist id="variant-name-suggestions">
              {SUGGESTIONS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>

          <div className="flex flex-col gap-2">
            <div className="hidden grid-cols-[minmax(0,1fr)_7rem_5.5rem_2rem] gap-2 px-0.5 text-xs font-medium text-muted-foreground sm:grid">
              <span>Version</span>
              <span>Prix (FCFA)</span>
              <span>{editing ? "Stock" : "Stock initial"}</span>
              <span className="sr-only">Retirer</span>
            </div>
            {value.rows.map((row, index) => {
              const locked = editing && !!row.id;
              return (
                <div
                  key={row.key}
                  className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2rem] gap-2 rounded-md border border-border p-2 sm:grid-cols-[minmax(0,1fr)_7rem_5.5rem_2rem] sm:border-0 sm:p-0"
                >
                  <Input
                    aria-label={`Nom de la version ${index + 1}`}
                    value={row.label}
                    onChange={(e) => update(row.key, { label: e.target.value })}
                    placeholder={index === 0 ? "Ex. 250 ml" : "Ex. 500 ml"}
                    maxLength={60}
                    className="col-span-2 sm:col-span-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Retirer la version ${row.label || index + 1}`}
                    onClick={() => onChange({ ...value, rows: value.rows.filter((r) => r.key !== row.key) })}
                    className="text-muted-foreground hover:text-destructive sm:order-last"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                  <Input
                    aria-label={`Prix de la version ${index + 1}`}
                    inputMode="decimal"
                    value={row.price}
                    onChange={(e) => update(row.key, { price: e.target.value })}
                    placeholder={basePrice ? String(basePrice) : "Prix de l'article"}
                  />
                  <Input
                    aria-label={`Stock de la version ${index + 1}`}
                    inputMode="numeric"
                    value={row.stock}
                    onChange={(e) => update(row.key, { stock: e.target.value })}
                    readOnly={locked}
                    aria-readonly={locked || undefined}
                    title={locked ? "Se gère dans la fenêtre Stock" : undefined}
                    placeholder="0"
                    className={`col-span-2 sm:col-span-1 ${locked ? "bg-muted" : ""}`}
                  />
                </div>
              );
            })}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit gap-1.5"
              onClick={() => onChange({ ...value, rows: [...value.rows, emptyRow()] })}
            >
              <Plus className="size-4" aria-hidden /> Ajouter une version
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Prix vide : prix de l&apos;article (promotion comprise).
            {editing && " Le stock d'une version enregistrée se change dans la fenêtre Stock ; une version ne peut être retirée qu'à stock nul."}
          </p>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </>
      )}
    </div>
  );
}

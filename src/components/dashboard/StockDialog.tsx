"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { DialogTour } from "@/components/onboarding/DialogTour";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { formatDateTime } from "@/lib/dateTime";
import { listVariants } from "@/lib/variants";
import type { Product } from "@/models/product/Product";
import { STOCK_MOVEMENT_LABEL, type StockMovement } from "@/models/stock/StockMovement";
import { stockService } from "@/services/StockService";

type Tab = "restock" | "adjust" | "history";

const TABS: { id: Tab; label: string }[] = [
  { id: "restock", label: "Réapprovisionner" },
  { id: "adjust", label: "Corriger" },
  { id: "history", label: "Historique" },
];

/** Entier saisi, ou `null` si le champ est vide ou invalide. */
function parseWhole(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  return Number(value.trim());
}

function signed(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}

/**
 * Stock d'un produit (BF-15, BF-16, 2026-10-03) : réapprovisionnement,
 * correction d'inventaire et historique des mouvements. Le stock ne se
 * modifie plus dans le formulaire produit : tout changement passe par ici
 * (ou par les commandes) et reste tracé.
 */
export function StockDialog({
  product,
  onClose,
  onStockChange,
}: {
  product: Product | null;
  onClose: () => void;
  /** Nouveau stock total ; et celui des versions modifiées (BF-17). */
  onStockChange: (productId: string, stock: number, variantStocks?: Record<string, number>) => void;
}) {
  return (
    <Dialog open={!!product} onOpenChange={(open) => !open && onClose()}>
      <DialogPortal className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto">
        {/* `key` : formulaires remis à zéro d'un produit à l'autre. */}
        {product && <StockPanel key={product.id} product={product} onStockChange={onStockChange} />}
      </DialogPortal>
    </Dialog>
  );
}

function StockPanel({
  product,
  onStockChange,
}: {
  product: Product;
  onStockChange: (productId: string, stock: number, variantStocks?: Record<string, number>) => void;
}) {
  const { profile } = useAuth();
  const isManager = profile?.role === "admin";
  const [tab, setTab] = useState<Tab>("restock");
  const [stock, setStock] = useState(product.stock);
  // Versions (BF-17) : chaque mouvement vise une version précise.
  const variants = listVariants(product);
  const [variantId, setVariantId] = useState<string | undefined>(variants[0]?.id);
  const [variantStocks, setVariantStocks] = useState<Record<string, number>>(() =>
    Object.fromEntries(variants.map((v) => [v.id, v.stock]))
  );
  const variant = variants.find((v) => v.id === variantId);
  /** Stock concerné par les formulaires : celui de la version choisie. */
  const targetStock = variantId ? (variantStocks[variantId] ?? 0) : stock;
  const [history, setHistory] = useState<StockMovement[] | null>(null);
  const [historyError, setHistoryError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [received, setReceived] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [supplierNote, setSupplierNote] = useState("");
  const [counted, setCounted] = useState("");
  const [reason, setReason] = useState("");

  const loadHistory = useCallback(() => {
    stockService
      .listProductHistory(product.shopId, product.id)
      .then((list) => {
        setHistory(list);
        setHistoryError(false);
      })
      .catch(() => setHistoryError(true));
  }, [product.shopId, product.id]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const receivedQty = parseWhole(received);
  const countedQty = parseWhole(counted);
  const price = purchasePrice.trim() ? Number(purchasePrice.replace(",", ".")) : undefined;
  const priceInvalid = price !== undefined && (!Number.isFinite(price) || price < 0);

  function done(stockAfter: number, message: string) {
    if (variantId) {
      const next = { ...variantStocks, [variantId]: stockAfter };
      const total = Object.values(next).reduce((sum, n) => sum + Math.max(n, 0), 0);
      setVariantStocks(next);
      setStock(total);
      onStockChange(product.id, total, { [variantId]: stockAfter });
    } else {
      setStock(stockAfter);
      onStockChange(product.id, stockAfter);
    }
    toast.success(message);
    setReceived("");
    setPurchasePrice("");
    setSupplierNote("");
    setCounted("");
    setReason("");
    setTab("history");
    loadHistory();
  }

  async function submit(action: () => Promise<number>, message: (stockAfter: number) => string) {
    setSaving(true);
    setError(null);
    try {
      const stockAfter = await action();
      done(stockAfter, message(stockAfter));
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "L'enregistrement a échoué. Réessayez.");
    } finally {
      setSaving(false);
    }
  }

  function handleRestock(event: React.FormEvent) {
    event.preventDefault();
    // La fenêtre peut s'ouvrir depuis le formulaire produit : sans ça, l'envoi
    // remonterait jusqu'à lui à travers le portail (événements React).
    event.stopPropagation();
    if (!receivedQty || priceInvalid) return;
    void submit(
      () =>
        stockService.restock({
          productId: product.id,
          ...(variantId ? { variantId } : {}),
          quantity: receivedQty,
          ...(supplierNote.trim() ? { note: supplierNote.trim() } : {}),
          ...(isManager && price !== undefined ? { purchasePrice: price } : {}),
        }),
      (after) =>
        `${receivedQty} unité${receivedQty > 1 ? "s" : ""} ajoutée${receivedQty > 1 ? "s" : ""}${variant ? ` (${variant.label})` : ""} : stock à ${after}.`
    );
  }

  function handleAdjust(event: React.FormEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (countedQty === null || !reason.trim()) return;
    void submit(
      () =>
        stockService.adjust({ productId: product.id, ...(variantId ? { variantId } : {}), countedStock: countedQty, note: reason.trim() }),
      (after) => `Stock corrigé${variant ? ` (${variant.label})` : ""} : ${after}.`
    );
  }

  const fieldClass =
    "w-full resize-none rounded-lg border border-border bg-background p-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring";

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <DialogTitle className="break-words">Stock — {product.name}</DialogTitle>
          <DialogDescription>
            Stock actuel : <strong data-testid="current-stock" className="text-foreground">{stock}</strong>
          </DialogDescription>
        </div>
        <DialogTour tourId="dialog-stock" />
      </div>

      {variants.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="stock-variant" help="Le stock se suit version par version : choisissez celle que vous réapprovisionnez ou recomptez.">
            {product.variantName || "Version"}
          </Label>
          <Select
            id="stock-variant"
            value={variantId}
            onChange={(e) => {
              setVariantId(e.target.value);
              setError(null);
            }}
          >
            {variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label} — {variantStocks[v.id] ?? 0} en stock
              </option>
            ))}
          </Select>
        </div>
      )}

      <div data-tour="stock-tabs" role="tablist" aria-label="Actions sur le stock" className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => {
              setTab(t.id);
              setError(null);
            }}
            className={`rounded-md px-2 py-1.5 text-xs font-medium sm:text-sm ${
              tab === t.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "restock" && (
        <form onSubmit={handleRestock} noValidate className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="stock-received" help="Le nombre d'unités que vous venez de recevoir. Il s'ajoute au stock actuel.">
              Quantité reçue
            </Label>
            <Input
              id="stock-received"
              data-tour="stock-received"
              inputMode="numeric"
              value={received}
              onChange={(e) => setReceived(e.target.value)}
              placeholder="Ex. 12"
            />
            {receivedQty ? (
              <p className="text-xs text-muted-foreground">
                Nouveau stock{variant ? ` (${variant.label})` : ""} : {targetStock + receivedQty}
              </p>
            ) : null}
          </div>
          {isManager && (
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="stock-price"
                help="Facultatif. Ce que vous a coûté une unité de cette livraison. Il remplace l'ancien prix d'achat pour le calcul de vos prochains gains. Visible de vous seul."
              >
                Prix d&apos;achat unitaire (FCFA)
              </Label>
              <Input
                id="stock-price"
                inputMode="decimal"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="Inchangé"
                aria-invalid={priceInvalid}
              />
              {priceInvalid && <p className="text-xs text-destructive">Le prix d&apos;achat doit être un montant positif.</p>}
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="stock-supplier" help="Facultatif. Le fournisseur, un numéro de bon de livraison… Il apparaîtra dans l'historique.">
              Note
            </Label>
            <textarea
              id="stock-supplier"
              rows={2}
              maxLength={300}
              value={supplierNote}
              onChange={(e) => setSupplierNote(e.target.value)}
              placeholder="Ex. Fournisseur Marché central"
              className={fieldClass}
            />
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button data-tour="stock-restock-submit" type="submit" disabled={saving || !receivedQty || priceInvalid} className="self-end">
            Ajouter au stock
          </Button>
        </form>
      )}

      {tab === "adjust" && (
        <form onSubmit={handleAdjust} noValidate className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Après un inventaire, indiquez la quantité réellement comptée : le stock y est remis et l&apos;écart est gardé dans l&apos;historique.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="stock-counted" help="Le nombre d'unités que vous avez réellement comptées, en rayon et en réserve.">
              Quantité comptée
            </Label>
            <Input
              id="stock-counted"
              inputMode="numeric"
              value={counted}
              onChange={(e) => setCounted(e.target.value)}
              placeholder={String(targetStock)}
            />
            {countedQty !== null && (
              <p className="text-xs text-muted-foreground">
                {countedQty === targetStock ? "Aucun écart avec le stock actuel." : `Écart : ${signed(countedQty - targetStock)}`}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="stock-reason" help="Obligatoire. Expliquez l'écart, ex. « 2 articles cassés » ou « erreur de saisie ».">
              Motif
            </Label>
            <textarea
              id="stock-reason"
              rows={2}
              maxLength={300}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex. 2 articles abîmés"
              className={fieldClass}
            />
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button
            type="submit"
            disabled={saving || countedQty === null || countedQty === targetStock || !reason.trim()}
            className="self-end"
          >
            Corriger le stock
          </Button>
        </form>
      )}

      {tab === "history" && (
        <div className="flex flex-col gap-2">
          {historyError ? (
            <p className="text-sm text-destructive">Impossible de charger l&apos;historique. Réessayez.</p>
          ) : history === null ? (
            <p className="text-sm text-muted-foreground">Chargement...</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun mouvement enregistré. L&apos;historique commence le 3 octobre 2026 : les mouvements plus anciens n&apos;y figurent pas.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
              {history.map((m) => (
                <li key={m.id} className="flex flex-col gap-0.5 px-3 py-2 text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-medium">
                      {STOCK_MOVEMENT_LABEL[m.type]}
                      {m.variantLabel && (
                        <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-xs font-normal text-muted-foreground">
                          {m.variantLabel}
                        </span>
                      )}
                    </span>
                    <span
                      className={`shrink-0 font-semibold tabular-nums ${
                        m.quantity > 0 ? "text-emerald-700" : m.quantity < 0 ? "text-red-600" : "text-muted-foreground"
                      }`}
                    >
                      {m.type === "initial" ? m.quantity : signed(m.quantity)}
                    </span>
                  </div>
                  <div className="flex flex-wrap justify-between gap-x-3 text-xs text-muted-foreground">
                    <span>
                      {m.createdAt?.toDate ? formatDateTime(m.createdAt.toDate()) : "À l'instant"}
                      {m.actorName ? ` · ${m.actorName}` : ""}
                    </span>
                    <span>Stock après : {m.stockAfter}</span>
                  </div>
                  {m.orderId && (
                    <Link href="/dashboard/orders" className="w-fit text-xs text-muted-foreground underline">
                      Commande n° {m.orderId.slice(0, 8).toUpperCase()}
                    </Link>
                  )}
                  {m.note && <p className="text-xs break-words text-muted-foreground">« {m.note} »</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}

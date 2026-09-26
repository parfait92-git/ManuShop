"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { Select } from "@/components/ui/select";
import type { OrderItem } from "@/models/order/OrderItem";
import type { Product } from "@/models/product/Product";

interface DraftLine extends OrderItem {
  key: string;
}

/**
 * BF-21 : commande manuelle enregistrée par le commerçant pour un client
 * physique (walk-in), sans compte — `OrderService.createOrder({..., manual:
 * true})`. Le picker d'articles reste volontairement simple (une ligne à la
 * fois depuis le catalogue de la boutique) : pas de recherche/variantes,
 * cohérent avec `ProductService.search` déjà "en mémoire, catalogue petit".
 */
export function ManualOrderDialog({
  open,
  onOpenChange,
  products,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  submitting: boolean;
  onSubmit: (input: {
    clientName: string;
    clientPhone: string;
    clientAddress: string;
    items: OrderItem[];
  }) => void;
}) {
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [lines, setLines] = useState<DraftLine[]>([]);

  function reset() {
    setClientName("");
    setClientPhone("");
    setClientAddress("");
    setProductId("");
    setQuantity(1);
    setLines([]);
  }

  function handleAddLine() {
    const product = products.find((p) => p.id === productId);
    if (!product || quantity < 1) return;
    setLines((current) => [
      ...current,
      {
        key: `${product.id}-${Date.now()}`,
        productId: product.id,
        name: product.name,
        quantity,
        unitPrice: product.price,
      },
    ]);
    setProductId("");
    setQuantity(1);
  }

  function handleRemoveLine(key: string) {
    setLines((current) => current.filter((line) => line.key !== key));
  }

  function handleSubmit() {
    if (!clientName.trim() || lines.length === 0) return;
    onSubmit({
      clientName: clientName.trim(),
      clientPhone,
      clientAddress,
      items: lines.map((line) => ({
        productId: line.productId,
        name: line.name,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
      })),
    });
    reset();
  }

  const total = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogPortal className="max-w-lg">
        <DialogTitle>Nouvelle commande manuelle</DialogTitle>
        <DialogDescription>
          Pour un client physique, sans compte (BF-21).
        </DialogDescription>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="manual-order-client-name">Nom du client</Label>
            <Input
              id="manual-order-client-name"
              value={clientName}
              onChange={(event) => setClientName(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="manual-order-client-phone">
              Téléphone (optionnel)
            </Label>
            <PhoneInput
              id="manual-order-client-phone"
              value={clientPhone}
              onChange={setClientPhone}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="manual-order-client-address">
              Adresse (optionnel)
            </Label>
            <Input
              id="manual-order-client-address"
              value={clientAddress}
              onChange={(event) => setClientAddress(event.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
          <p className="text-sm font-medium">Articles</p>
          <div className="flex items-end gap-2">
            <Select
              value={productId}
              onChange={(event) => setProductId(event.target.value)}
              aria-label="Produit"
              className="flex-1"
            >
              <option value="">Choisir un produit</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} — {product.price.toLocaleString("fr-FR")} FCFA
                </option>
              ))}
            </Select>
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value) || 1)}
              aria-label="Quantité"
              className="w-20"
            />
            <Button
              type="button"
              size="icon"
              aria-label="Ajouter l'article"
              onClick={handleAddLine}
              disabled={!productId}
            >
              <Plus className="size-4" />
            </Button>
          </div>

          {lines.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {lines.map((line) => (
                <li
                  key={line.key}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span>
                    {line.name} × {line.quantity}
                  </span>
                  <span className="flex items-center gap-2">
                    {(line.unitPrice * line.quantity).toLocaleString("fr-FR")}{" "}
                    FCFA
                    <button
                      type="button"
                      aria-label={`Retirer ${line.name}`}
                      onClick={() => handleRemoveLine(line.key)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="size-3.5" />
                    </button>
                  </span>
                </li>
              ))}
              <li className="flex items-center justify-between border-t border-border pt-1.5 text-sm font-medium">
                <span>Total</span>
                <span>{total.toLocaleString("fr-FR")} FCFA</span>
              </li>
            </ul>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            type="button"
            disabled={!clientName.trim() || lines.length === 0 || submitting}
            onClick={handleSubmit}
          >
            {submitting ? "Création..." : "Créer la commande"}
          </Button>
        </div>
      </DialogPortal>
    </Dialog>
  );
}

"use client";

import { Star } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { OrderItem } from "@/models/order/OrderItem";

export interface ReviewTarget {
  orderId: string;
  items: OrderItem[];
}

export interface ReviewSubmission {
  productId: string;
  rating?: number;
  comment: string;
  reason?: "defective";
}

/**
 * BF-76 : avis client sur un article d'une commande livrée — même
 * structure contrôlée que `OrderReasonDialog` (une cible à la fois, `key`
 * côté appelant pour réinitialiser entre deux commandes). Ne propose un
 * choix d'article que si la commande en contient plusieurs — sinon le seul
 * article de la commande est retenu directement, pas de sélection inutile.
 */
export function ReviewDialog({
  target,
  onCancel,
  onSubmit,
}: {
  target: ReviewTarget | null;
  onCancel: () => void;
  onSubmit: (submission: ReviewSubmission) => void;
}) {
  const [productId, setProductId] = useState(target?.items[0]?.productId ?? "");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [defective, setDefective] = useState(false);

  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onCancel()}>
      <DialogPortal className="max-w-sm">
        <DialogTitle>Laisser un avis</DialogTitle>
        <DialogDescription>
          Votre avis sera visible sur la fiche du produit concerné.
        </DialogDescription>

        {target && target.items.length > 1 && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="review-product">Article concerné</Label>
            <Select
              id="review-product"
              value={productId}
              onChange={(event) => setProductId(event.target.value)}
            >
              {target.items.map((item) => (
                <option key={item.productId} value={item.productId}>
                  {item.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div
          className="flex items-center gap-1"
          role="radiogroup"
          aria-label="Note"
        >
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={rating === value}
              aria-label={`${value} étoile${value > 1 ? "s" : ""}`}
              onClick={() => setRating(value)}
              className="text-muted-foreground"
            >
              <Star
                className={
                  rating >= value
                    ? "size-6 fill-amber-500 text-amber-500"
                    : "size-6"
                }
              />
            </button>
          ))}
        </div>

        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          rows={3}
          placeholder="Votre avis..."
          className="w-full resize-none rounded-lg border border-border bg-background p-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring"
        />

        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={defective}
            onChange={(event) => setDefective(event.target.checked)}
            className="size-4"
          />
          Signaler un article défectueux
        </label>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button
            type="button"
            disabled={!comment.trim() || !productId}
            onClick={() =>
              onSubmit({
                productId,
                rating: rating > 0 ? rating : undefined,
                comment: comment.trim(),
                reason: defective ? "defective" : undefined,
              })
            }
          >
            Envoyer
          </Button>
        </div>
      </DialogPortal>
    </Dialog>
  );
}

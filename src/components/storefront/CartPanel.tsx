"use client";

import { Minus, Plus, X } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { useShop } from "@/hooks/useShop";
import { buildWhatsAppOrderLink } from "@/lib/whatsapp";
import { cartTotal, useCartStore } from "@/store/cartStore";

export function CartPanel({ onClose }: { onClose: () => void }) {
  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const { shop } = useShop();

  return (
    <div className="absolute top-full right-0 z-30 mt-2 w-80 rounded-lg border border-border bg-background p-4 shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Votre panier</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer le panier"
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Votre panier est vide.</p>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {items.map((item) => (
              <li key={item.productId} className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.price.toLocaleString("fr-FR")} FCFA
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Diminuer la quantité"
                    onClick={() =>
                      updateQuantity(item.productId, item.quantity - 1)
                    }
                    className="flex size-6 items-center justify-center rounded-full border border-border"
                  >
                    <Minus className="size-3" />
                  </button>
                  <span className="w-5 text-center text-sm">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    aria-label="Augmenter la quantité"
                    onClick={() =>
                      updateQuantity(item.productId, item.quantity + 1)
                    }
                    className="flex size-6 items-center justify-center rounded-full border border-border"
                  >
                    <Plus className="size-3" />
                  </button>
                </div>
                <button
                  type="button"
                  aria-label={`Retirer ${item.name}`}
                  onClick={() => removeItem(item.productId)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-sm font-medium">
            <span>Total</span>
            <span>{cartTotal(items).toLocaleString("fr-FR")} FCFA</span>
          </div>

          {/* Un vrai <a>, pas <Button render={<a/>}> : Base UI documente
          explicitement qu'un lien ne doit pas recevoir la sémantique bouton
          via `render`. Repli sur un <button disabled> tant que la boutique
          n'est pas chargée (pas de lien WhatsApp valide à proposer). */}
          {shop ? (
            <a
              href={buildWhatsAppOrderLink(shop, items)}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ className: "mt-3 w-full" })}
            >
              Commander via WhatsApp
            </a>
          ) : (
            <button
              type="button"
              disabled
              className={buttonVariants({ className: "mt-3 w-full" })}
            >
              Commander via WhatsApp
            </button>
          )}
        </>
      )}
    </div>
  );
}

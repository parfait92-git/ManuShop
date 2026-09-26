"use client";

import { Heart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { Product } from "@/models/product/Product";
import { productService } from "@/services/ProductService";
import { useCartStore } from "@/store/cartStore";

export function StorefrontProductCard({ product }: { product: Product }) {
  const addItem = useCartStore((state) => state.addItem);
  const [liked, setLiked] = useState(false);
  const badge = productService.getBadge(product);
  const price = product.isPromo && product.promoPrice ? product.promoPrice : product.price;

  return (
    // `relative` ici (pas sur la seule zone image) : le bouton favoris sort du
    // <Link> ci-dessous pour ne pas imbriquer un <button> dans un <a> (invalide
    // en HTML), mais reste positionné visuellement au même endroit qu'avant.
    <article className="relative flex flex-col overflow-hidden rounded-xl border border-border bg-background">
      <Link href={`/catalogue/${product.id}`} className="flex flex-1 flex-col">
        <div className="relative aspect-square bg-muted">
          {product.images[0] && (
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              sizes="(min-width: 768px) 33vw, 100vw"
              className="object-cover"
            />
          )}
          {badge && (
            <span className="absolute top-3 left-3 rounded-full bg-background px-2.5 py-1 text-xs font-medium">
              {badge}
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2 p-4 pb-0">
          <p className="text-xs font-semibold tracking-wide text-primary uppercase">
            {product.category}
          </p>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">{product.name}</h3>
            <span className="shrink-0 text-sm font-semibold">
              {price.toLocaleString("fr-FR")} FCFA
            </span>
          </div>
        </div>
      </Link>

      <button
        type="button"
        onClick={() => setLiked((value) => !value)}
        aria-label={liked ? "Retirer des favoris" : "Ajouter aux favoris"}
        aria-pressed={liked}
        className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full bg-background"
      >
        <Heart className="size-4" fill={liked ? "currentColor" : "none"} />
      </button>

      <div className="p-4 pt-2">
        <Button
          className="w-full"
          onClick={() =>
            addItem({
              productId: product.id,
              name: product.name,
              price,
              image: product.images[0] ?? "",
            })
          }
        >
          Ajouter au panier
        </Button>
      </div>
    </article>
  );
}

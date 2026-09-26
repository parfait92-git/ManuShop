"use client";

import { ChevronLeft, Heart, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/button";
import type { Product } from "@/models/product/Product";
import type { Review } from "@/models/review/Review";
import { productService, type StockStatus } from "@/services/ProductService";
import { reviewService } from "@/services/ReviewService";
import { useCartStore } from "@/store/cartStore";

const STOCK_LABEL: Record<StockStatus, string> = {
  "in-stock": "En stock",
  "low-stock": "Stock faible",
  "out-of-stock": "Rupture de stock",
};

// Nuance -600 (pas -400) : le storefront est un thème clair (voir
// CataloguePageContent/StorefrontProductCard, ni glass ni fond sombre),
// contrairement à la landing page marketing — -400 manquerait de contraste
// sur un fond blanc.
const STOCK_CLASS: Record<StockStatus, string> = {
  "in-stock": "text-emerald-600",
  "low-stock": "text-amber-600",
  "out-of-stock": "text-red-600",
};

/** BF-71/72/73. `product === undefined` = chargement, `null` = introuvable —
 * distinct de la boutique tout entière absente/dépubliée (`/catalogue`), qui
 * concerne un id de produit précis qui n'existe simplement pas. */
export function ProductDetailPageContent({ productId }: { productId: string }) {
  const [product, setProduct] = useState<Product | null | undefined>(undefined);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [liked, setLiked] = useState(false);
  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    let active = true;

    productService.getProduct(productId).then((result) => {
      if (active) setProduct(result);
    });

    // Les avis sont un contenu secondaire de cette page : un échec ici (règles
    // Firestore pas encore déployées, réseau...) ne doit jamais empêcher le
    // produit lui-même de s'afficher — d'où un .catch() séparé plutôt qu'un
    // seul Promise.all() qui ferait échouer les deux ensemble.
    reviewService
      .listByProduct(productId)
      .then((list) => {
        if (active) setReviews(list);
      })
      .catch(() => {
        if (active) setReviews([]);
      });

    return () => {
      active = false;
    };
  }, [productId]);

  if (product === undefined) {
    return (
      <p className="px-6 py-10 text-center text-sm text-muted-foreground">
        Chargement...
      </p>
    );
  }

  if (product === null) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-6 py-16 text-center">
        <p>Produit introuvable.</p>
        <Link href="/catalogue" className="text-sm text-primary underline">
          Retour à la boutique
        </Link>
      </div>
    );
  }

  const badge = productService.getBadge(product);
  const status = productService.getStockStatus(product);
  const price =
    product.isPromo && product.promoPrice ? product.promoPrice : product.price;
  const averageRating = reviewService.getAverageRating(reviews);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
      <Link
        href="/catalogue"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Retour à la boutique
      </Link>

      <h1 className="text-4xl font-bold">{product.name}</h1>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-muted">
            {product.images[0] && (
              <Image
                src={product.images[0]}
                alt={product.name}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-contain"
              />
            )}
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-2">
              {product.images.map((image) => (
                <div
                  key={image}
                  className="relative size-20 overflow-hidden rounded-lg border border-border bg-muted"
                >
                  <Image src={image} alt="" fill sizes="80px" className="object-contain" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <Badge className="w-fit">
            {product.category}
            {badge ? ` · ${badge}` : ""}
          </Badge>
          <p className="text-3xl font-bold">
            {price.toLocaleString("fr-FR")} FCFA
          </p>
          <p className="text-muted-foreground">{product.description}</p>
          <p className={`text-sm font-medium ${STOCK_CLASS[status]}`}>
            {STOCK_LABEL[status]}
            {status !== "out-of-stock" ? ` · ${product.stock} disponibles` : ""}
          </p>

          <div className="flex items-center gap-3">
            <Button
              className="flex-1"
              disabled={status === "out-of-stock"}
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
            <button
              type="button"
              onClick={() => setLiked((value) => !value)}
              aria-label={liked ? "Retirer des favoris" : "Ajouter aux favoris"}
              aria-pressed={liked}
              className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border"
            >
              <Heart className="size-4" fill={liked ? "currentColor" : "none"} />
            </button>
          </div>

          <div className="rounded-2xl border border-border bg-muted/40 p-4">
            <h2 className="font-semibold">Avis clients</h2>
            {reviews.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Aucun avis pour le moment.
              </p>
            ) : (
              <>
                {averageRating !== null && (
                  <p className="mt-2 flex items-center gap-1 text-sm">
                    <Star className="size-4 fill-amber-500 text-amber-500" />
                    {averageRating.toFixed(1)} ({reviews.length} avis)
                  </p>
                )}
                <ul className="mt-3 flex flex-col gap-2">
                  {reviews.map((review) => (
                    <li key={review.id} className="text-sm text-muted-foreground">
                      « {review.comment} »
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

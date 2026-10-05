"use client";

import { Heart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/AuthProvider";
import { Button, buttonVariants } from "@/components/ui/button";
import type { Product } from "@/models/product/Product";
import type { Shop } from "@/models/shop/Shop";
import { productService } from "@/services/ProductService";
import { effectivePrice } from "@/lib/promo";
import { hasPriceRange, hasVariants, lowestPrice } from "@/lib/variants";
import { useAddToCart } from "@/hooks/useAddToCart";
import { useMoney } from "@/hooks/useMoney";
import { useShopCurrency } from "@/hooks/useShopCurrency";
import { productImageAlt } from "@/lib/seo";

export function StorefrontProductCard({
  product,
  shop,
  shopHref,
}: {
  product: Product;
  /** Fourni uniquement par un contexte multi-boutique (ex. `/catalogue`
   * agrégé, BF-108) — absent quand la page est déjà scopée à une seule
   * boutique (`/boutique/[shopId]`, `/demo-catalogue`), pour ne pas répéter
   * une info déjà visible dans l'en-tête de la page. */
  shop?: Shop;
  /** Par défaut `/boutique/{shop.id}` — la démo (BF-125) la remplace par
   * l'équivalent `/demo-catalogue/boutique/{shop.id}`. Ignoré si `shop`
   * n'est pas fourni. */
  shopHref?: string;
}) {
  const addItem = useAddToCart();
  const { firebaseUser, profile, toggleFavorite } = useAuth();
  const liked = profile?.favoriteProductIds?.includes(product.id) ?? false;
  const badge = productService.getBadge(product);
  // Avec des versions (BF-17) : le prix le plus bas, « Dès » s'ils varient ;
  // la version se choisit sur la fiche de l'article.
  const withVariants = hasVariants(product);
  const price = withVariants ? lowestPrice(product) : effectivePrice(product);
  const priceFrom = withVariants && hasPriceRange(product);
  const money = useMoney(useShopCurrency(product.shopId));

  return (
    // `relative` ici (pas sur la seule zone image) : le bouton favoris sort du
    // <Link> ci-dessous pour ne pas imbriquer un <button> dans un <a> (invalide
    // en HTML), mais reste positionné visuellement au même endroit qu'avant.
    <article className="relative flex flex-col overflow-hidden rounded-xl border border-border bg-background">
      <Link
        href={`/catalogue/${product.id}`}
        className="group flex flex-1 flex-col"
      >
        <div className="relative aspect-square overflow-hidden bg-muted">
          {product.images[0] && (
            <Image
              src={product.images[0]}
              alt={productImageAlt(product, { shopName: shop?.name })}
              fill
              sizes="(min-width: 768px) 33vw, 100vw"
              className="object-cover transition-transform duration-300 group-hover:scale-110 group-focus-visible:scale-110"
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
          {/* `flex-wrap` : avec une police agrandie, le prix passe sous le
          nom au lieu de sortir de la carte. */}
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
            <h3 className="text-sm font-semibold">{product.name}</h3>
            <span className="shrink-0 text-sm font-semibold">
              {priceFrom ? `Dès ${money(price)}` : money(price)}
            </span>
          </div>
        </div>
      </Link>

      <button

        data-tour="product-favorite"
        type="button"
        onClick={() => {
          if (!firebaseUser) {
            toast.error("Connectez-vous pour ajouter un article à vos favoris.");
            return;
          }
          toggleFavorite(product.id);
        }}
        aria-label={liked ? "Retirer des favoris" : "Ajouter aux favoris"}
        aria-pressed={liked}
        className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full bg-background"
      >
        <Heart
          className={`size-4 ${liked ? "text-destructive" : ""}`}
          fill={liked ? "currentColor" : "none"}
        />
      </button>

      <div className="flex flex-col gap-2 p-4 pt-2">
        {shop && (
          // Lien frère du <Link> produit ci-dessus, pas imbriqué dedans —
          // même raison que le bouton favoris : deux <a> ne peuvent pas
          // s'imbriquer en HTML valide.
          <Link
            href={shopHref ?? `/boutique/${shop.id}`}
            className="truncate text-xs text-muted-foreground hover:text-foreground"
          >
            {shop.name}
          </Link>
        )}
        {withVariants ? (
          <Link
            data-tour="product-add-to-cart"
            href={`/catalogue/${product.id}`}
            className={buttonVariants({ className: "w-full" })}
          >
            Choisir une version
          </Link>
        ) : (
          <Button
            data-tour="product-add-to-cart"
            className="w-full"
            onClick={() =>
              addItem({
                productId: product.id,
                name: product.name,
                price,
                image: product.images[0] ?? "",
                stock: product.stock,
                shopId: product.shopId,
              })
            }
          >
            Ajouter au panier
          </Button>
        )}
      </div>
    </article>
  );
}

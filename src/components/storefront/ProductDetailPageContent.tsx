"use client";

import { ChevronLeft, ExternalLink, Heart, Star, Store, ZoomIn } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/AuthProvider";
import { usePremiumAccess } from "@/hooks/usePremiumCatalog";
import { ShopBrandingSetter } from "@/components/providers/ShopBrandingSetter";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/button";
import { ProductImageLightbox } from "@/components/storefront/ProductImageLightbox";
import { SellerReply } from "@/components/storefront/SellerReply";
import {
  CLIENT_CONTACT_METHOD_LABELS,
  buildClientContactLink,
} from "@/lib/clientContactMethods";
import { formatShopAge } from "@/lib/shopAge";
import {
  SOCIAL_NETWORK_LABELS,
  getPrimarySocialNetworkUrl,
} from "@/lib/shopSocialNetworks";
import type { Product } from "@/models/product/Product";
import type { Review } from "@/models/review/Review";
import type { ClientContactMethod, Shop } from "@/models/shop/Shop";
import { productService, type StockStatus } from "@/services/ProductService";
import { reviewService } from "@/services/ReviewService";
import { shopService } from "@/services/ShopService";
import { isOptimizableImage } from "@/lib/imageHosts";
import { effectivePrice } from "@/lib/promo";
import { listVariants, variantPrice } from "@/lib/variants";
import { useAddToCart } from "@/hooks/useAddToCart";
import { useMoney } from "@/hooks/useMoney";
import { shopCurrency } from "@/lib/currency";
import { productImageAlt } from "@/lib/seo";

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
  const [shop, setShop] = useState<Shop | null>(null);
  /** Photo affichée en grand sur la page, et dans la vue plein écran
   * (`null` : fermée). */
  const [selectedImage, setSelectedImage] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  /** Version choisie (BF-17) ; `null` : la première disponible. */
  const [chosenVariant, setChosenVariant] = useState<string | null>(null);
  const hasAccess = usePremiumAccess(shop);
  const money = useMoney(shopCurrency(shop));
  const [reviews, setReviews] = useState<Review[]>([]);
  const addItem = useAddToCart();
  const { firebaseUser, profile, toggleFavorite } = useAuth();

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

  // Bloc vendeur (BF-128) : chargé séparément, une fois le produit connu
  // (besoin de `product.shopId`) — un échec ici ne doit jamais empêcher le
  // produit lui-même de s'afficher, même logique que les avis ci-dessus.
  useEffect(() => {
    if (!product) return;
    let active = true;
    shopService
      .getShop(product.shopId)
      .then((data) => {
        if (active) setShop(data);
      })
      .catch(() => {
        if (active) setShop(null);
      });
    return () => {
      active = false;
    };
  }, [product]);

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
  const variants = listVariants(product);
  const variant =
    variants.find((v) => v.id === chosenVariant) ?? variants.find((v) => v.stock > 0) ?? variants[0];
  // Avec des versions, prix et disponibilité sont ceux de la version choisie.
  const status: StockStatus = variant
    ? variant.stock <= 0
      ? "out-of-stock"
      : variant.stock <= product.stockThreshold
        ? "low-stock"
        : "in-stock"
    : productService.getStockStatus(product);
  const available = variant ? variant.stock : product.stock;
  const price = variant ? variantPrice(product, variant) : effectivePrice(product);
  const averageRating = reviewService.getAverageRating(reviews);
  const socialUrl = shop ? getPrimarySocialNetworkUrl(shop) : null;
  const liked = profile?.favoriteProductIds?.includes(product.id) ?? false;

  // BF-105 : la liste enrichie de canaux (si activée, premium) remplace le
  // simple lien "Voir sur {réseau}" de BF-128 plutôt que de s'y ajouter —
  // éviter deux façons redondantes d'afficher le même réseau social.
  const contactLinks =
    shop && hasAccess("advancedContact")
      ? (shop.clientContactMethods ?? [])
          .map((method) => ({
            method,
            href: buildClientContactLink(shop, method),
          }))
          .filter(
            (entry): entry is { method: ClientContactMethod; href: string } =>
              !!entry.href
          )
      : [];

  // Photo choisie, bornée au nombre de photos (le produit a pu changer).
  const shownIndex = selectedImage < product.images.length ? selectedImage : 0;
  const mainImage = product.images[shownIndex];
  const imageAlts = product.images.map((_, index) =>
    productImageAlt(product, { shopName: shop?.name, index, total: product.images.length })
  );

  return (
    <>
      {/* Aux couleurs de la boutique de l'article. */}
      {shop && <ShopBrandingSetter shopId={shop.id} name={shop.name} logo={shop.logo || undefined} />}
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
      <Link
        href="/catalogue"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Retour à la boutique
      </Link>

      <h1 className="text-3xl font-bold hyphens-auto break-words sm:text-4xl">{product.name}</h1>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <div data-tour="product-gallery" className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-muted">
            {mainImage && (
              <button
                type="button"
                onClick={() => setLightboxIndex(shownIndex)}
                aria-label="Agrandir la photo"
                className="group absolute inset-0 cursor-zoom-in focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <Image
                  src={mainImage}
                  alt={imageAlts[shownIndex]}
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  // Plus grand élément de la page : chargé tout de suite.
                  loading="eager"
                  className="object-contain transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                />
                <span className="absolute right-3 bottom-3 flex size-9 items-center justify-center rounded-full bg-background/85 text-foreground opacity-80 shadow-sm transition group-hover:scale-110 group-hover:opacity-100 motion-reduce:transition-none">
                  <ZoomIn className="size-4" aria-hidden />
                </span>
              </button>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {product.images.map((image, index) => (
                <button
                  key={image}
                  type="button"
                  aria-label={`Agrandir la photo ${index + 1} sur ${product.images.length}`}
                  aria-current={index === shownIndex ? "true" : undefined}
                  onClick={() => {
                    setSelectedImage(index);
                    setLightboxIndex(index);
                  }}
                  className={`relative size-20 cursor-zoom-in overflow-hidden rounded-lg border-2 bg-muted transition duration-200 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${
                    index === shownIndex ? "border-foreground" : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <Image
                    src={image}
                    alt={imageAlts[index]}
                    fill
                    sizes="80px"
                    // Visibles d'emblée, et la première partage la source de
                    // la photo principale (sinon Next la croit chargée tard).
                    loading="eager"
                    className="object-contain"
                  />
                </button>
              ))}
            </div>
          )}
          <ProductImageLightbox
            images={product.images}
            alts={imageAlts}
            index={lightboxIndex}
            onIndexChange={(index) => {
              setLightboxIndex(index);
              setSelectedImage(index);
            }}
            onClose={() => setLightboxIndex(null)}
            title={product.name}
          />
        </div>

        <div className="flex flex-col gap-4">
          <Badge className="w-fit">
            {product.category}
            {badge ? ` · ${badge}` : ""}
          </Badge>
          <p className="text-3xl font-bold">
            {money(price)}
          </p>
          <p className="text-muted-foreground">{product.description}</p>
          <p className={`text-sm font-medium ${STOCK_CLASS[status]}`}>
            {STOCK_LABEL[status]}
            {status !== "out-of-stock" ? ` · ${available} disponible${available > 1 ? "s" : ""}` : ""}
          </p>

          {variants.length > 0 && (
            <div data-tour="product-variants" className="flex flex-col gap-2">
              <p id="variant-choice" className="text-sm font-medium">
                {product.variantName || "Version"} : <span className="font-normal text-muted-foreground">{variant?.label}</span>
              </p>
              <div role="radiogroup" aria-labelledby="variant-choice" className="flex flex-wrap gap-2">
                {variants.map((v) => {
                  const selected = v.id === variant?.id;
                  const soldOut = v.stock <= 0;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-label={`${v.label}${soldOut ? " (épuisé)" : ""}`}
                      onClick={() => setChosenVariant(v.id)}
                      className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                        selected
                          ? "border-foreground bg-foreground text-background"
                          : "border-border hover:border-muted-foreground"
                      } ${soldOut ? "text-muted-foreground line-through decoration-1" : ""} ${selected && soldOut ? "text-background/70" : ""}`}
                    >
                      {v.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button
              data-tour="product-buy"
              className="flex-1"
              disabled={status === "out-of-stock"}
              onClick={() =>
                addItem({
                  productId: product.id,
                  name: product.name,
                  price,
                  image: product.images[0] ?? "",
                  stock: available,
                  shopId: product.shopId,
                  ...(variant ? { variantId: variant.id, variantLabel: variant.label } : {}),
                })
              }
            >
              Ajouter au panier
            </Button>
            <button
              data-tour="product-detail-favorite"
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
              className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border"
            >
              <Heart
                className={`size-4 ${liked ? "text-destructive" : ""}`}
                fill={liked ? "currentColor" : "none"}
              />
            </button>
          </div>

          {shop && (
            <div data-tour="product-seller" className="rounded-2xl border border-border p-4">
              <h2 className="font-semibold">Vendu par</h2>
              <Link
                href={`/boutique/${shop.id}`}
                className="mt-3 flex items-start gap-3"
              >
                <div className="relative size-12 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
                  {shop.logo ? (
                    <Image
                      src={shop.logo}
                      alt=""
                      fill
                      sizes="48px"
                      className="object-cover"
                      // Voir ShopSummaryCard : le logo peut venir d'une URL
                      // externe collée à la main, pas seulement d'un upload
                      // Cloudinary.
                      unoptimized={!isOptimizableImage(shop.logo)}
                    />
                  ) : (
                    <span className="flex size-full items-center justify-center text-muted-foreground">
                      <Store className="size-5" />
                    </span>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="font-medium hover:underline">
                    {shop.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatShopAge(shop.createdAt)}
                  </span>
                </div>
              </Link>

              {shop.description && (
                <p className="mt-3 text-sm text-muted-foreground">
                  {shop.description}
                </p>
              )}

              {contactLinks.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-3">
                  {contactLinks.map(({ method, href }) => (
                    <a
                      key={method}
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                    >
                      {CLIENT_CONTACT_METHOD_LABELS[method]}
                      <ExternalLink className="size-3.5" />
                    </a>
                  ))}
                </div>
              ) : (
                socialUrl &&
                shop.primarySocialNetwork && (
                  <a
                    href={socialUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    Voir sur {SOCIAL_NETWORK_LABELS[shop.primarySocialNetwork]}
                    <ExternalLink className="size-3.5" />
                  </a>
                )
              )}
            </div>
          )}

          <div data-tour="product-reviews" className="rounded-2xl border border-border bg-muted/40 p-4">
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
                      <p className="break-words">« {review.comment} »</p>
                      {/* Réponse publique de la boutique (2026-10-02). */}
                      {review.reply && <SellerReply reply={review.reply} />}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

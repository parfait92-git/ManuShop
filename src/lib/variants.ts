/**
 * Versions d'un produit (BF-17, 2026-10-04) — règles partagées par la
 * vitrine, le tableau de bord et le serveur (formes minimales, sans
 * dépendre du SDK Firebase de l'un ou l'autre).
 */
import { effectivePrice, isPromoActive, type PromoFields } from "@/lib/promo";
import type { ProductVariant } from "@/models/product/ProductVariant";

export interface VariantFields extends PromoFields {
  variants?: Record<string, ProductVariant>;
}

export interface VariantEntry extends ProductVariant {
  id: string;
}

/** Versions dans leur ordre d'affichage. */
export function listVariants(product: { variants?: Record<string, ProductVariant> }): VariantEntry[] {
  return Object.entries(product.variants ?? {})
    .map(([id, variant]) => ({ id, ...variant }))
    .sort((a, b) => a.position - b.position || a.label.localeCompare(b.label, "fr"));
}

export function hasVariants(product: { variants?: Record<string, ProductVariant> }): boolean {
  return Object.keys(product.variants ?? {}).length > 0;
}

/**
 * Prix d'une version : son prix propre s'il en a un, sinon celui du
 * produit — prix promotionnel compris tant que la promotion court.
 */
export function variantPrice(product: VariantFields, variant: ProductVariant | undefined, now: Date = new Date()): number {
  if (variant && typeof variant.price === "number") return variant.price;
  return effectivePrice(product, now);
}

/** Prix le plus bas parmi les versions disponibles (« À partir de »), ou
 * parmi toutes si aucune n'est en stock. */
export function lowestPrice(product: VariantFields, now: Date = new Date()): number {
  const variants = listVariants(product);
  if (variants.length === 0) return effectivePrice(product, now);
  const pool = variants.some((v) => v.stock > 0) ? variants.filter((v) => v.stock > 0) : variants;
  return Math.min(...pool.map((v) => variantPrice(product, v, now)));
}

/** Les versions ont-elles des prix différents (« À partir de » utile) ? */
export function hasPriceRange(product: VariantFields, now: Date = new Date()): boolean {
  const prices = new Set(listVariants(product).map((v) => variantPrice(product, v, now)));
  return prices.size > 1;
}

/** Une version profite-t-elle de la promotion (pas de prix propre) ? */
export function variantOnPromo(product: VariantFields, variant: ProductVariant, now: Date = new Date()): boolean {
  return typeof variant.price !== "number" && isPromoActive(product, now);
}

/** Nom affiché d'un article commandé, version comprise. */
export function lineName(productName: string, variantLabel?: string): string {
  return variantLabel ? `${productName} — ${variantLabel}` : productName;
}

export function totalVariantStock(variants: Record<string, ProductVariant>): number {
  return Object.values(variants).reduce((sum, v) => sum + Math.max(v.stock, 0), 0);
}

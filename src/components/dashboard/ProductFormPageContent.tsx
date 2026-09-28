"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { ProductForm } from "@/components/dashboard/ProductForm";
import type { Category } from "@/models/category/Category";
import type { Product } from "@/models/product/Product";
import { categoryService } from "@/services/CategoryService";
import { productService } from "@/services/ProductService";

export function ProductFormPageContent({
  shopId,
  productId,
}: {
  shopId: string;
  productId?: string;
}) {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [product, setProduct] = useState<Product | null | undefined>(
    productId ? undefined : null
  );

  useEffect(() => {
    let active = true;
    categoryService.listCategories(shopId).then((data) => {
      if (active) setCategories(data);
    });
    return () => {
      active = false;
    };
  }, [shopId]);

  useEffect(() => {
    if (!productId) return;
    let active = true;
    productService.getProduct(productId).then((data) => {
      if (active) setProduct(data);
    });
    return () => {
      active = false;
    };
  }, [productId]);

  if (categories === null || product === undefined) {
    return <p className="text-sm text-muted-foreground">Chargement...</p>;
  }

  if (productId && product === null) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-destructive">Produit introuvable.</p>
        <Link
          href="/dashboard/products"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Retour aux produits
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <Link
        href="/dashboard/products"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Retour aux produits
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">
        {product ? "Modifier le produit" : "Nouveau produit"}
      </h1>
      <ProductForm
        shopId={shopId}
        categories={categories}
        product={product ?? undefined}
      />
    </div>
  );
}

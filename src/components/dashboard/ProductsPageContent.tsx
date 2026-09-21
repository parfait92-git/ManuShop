"use client";

import { useEffect, useState } from "react";

import { ProductList } from "@/components/dashboard/ProductList";
import type { Product } from "@/models/product/Product";
import { productService } from "@/services/ProductService";

export function ProductsPageContent({ shopId }: { shopId: string }) {
  const [products, setProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    let active = true;
    productService.listProducts(shopId).then((data) => {
      if (active) setProducts(data);
    });
    return () => {
      active = false;
    };
  }, [shopId]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Produits</h1>
      {products === null ? (
        <p className="text-sm text-muted-foreground">Chargement...</p>
      ) : (
        <ProductList initialProducts={products} />
      )}
    </div>
  );
}

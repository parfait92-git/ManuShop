"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { DemoPreviewBanner } from "@/components/dashboard/DemoPreviewBanner";
import { ProductList } from "@/components/dashboard/ProductList";
import { getArticlesByShop, mockShops } from "@/data/mockData";
import type { Category } from "@/models/category/Category";
import type { Product } from "@/models/product/Product";
import { categoryService } from "@/services/CategoryService";
import { productService } from "@/services/ProductService";

const DEMO_SHOP = mockShops.find((shop) => shop.id === "shop-mode-237")!;
const DEMO_PRODUCTS = getArticlesByShop(DEMO_SHOP.id);

/** Aperçu en lecture seule (pas de lien modifier/supprimer — voir
 * DemoPreviewBanner) affiché quand la boutique n'a encore aucun vrai
 * produit, pour montrer à quoi ressemblera cette page une fois remplie. */
function DemoProductPreview() {
  return (
    <div className="flex flex-col gap-4">
      <DemoPreviewBanner
        title="Exemple — à quoi ressemblera votre catalogue"
        description={`Aperçu basé sur « ${DEMO_SHOP.name} », une boutique de démonstration. Ajoutez votre premier produit ci-dessus pour le remplacer.`}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {DEMO_PRODUCTS.map((product) => (
          <div
            key={product.id}
            className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3 opacity-80"
          >
            <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
              {product.images[0] && (
                <Image
                  src={product.images[0]}
                  alt=""
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{product.name}</p>
              <p className="text-xs text-muted-foreground">
                {product.category} · {product.price.toLocaleString("fr-FR")}{" "}
                FCFA
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProductsPageContent({ shopId }: { shopId: string }) {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    let active = true;
    Promise.all([
      productService.listActive(shopId),
      categoryService.listCategories(shopId),
    ]).then(([productList, categoryList]) => {
      if (!active) return;
      setProducts(productList);
      setCategories(categoryList);
    });
    return () => {
      active = false;
    };
  }, [shopId]);

  if (products === null) {
    return <p className="text-sm text-muted-foreground">Chargement...</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
          Produits et publication
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Gérez votre catalogue et décidez quels articles sont visibles par
          vos clients.
        </p>
      </div>
      <ProductList initialProducts={products} categories={categories} />
      {products.length === 0 && <DemoProductPreview />}
    </div>
  );
}

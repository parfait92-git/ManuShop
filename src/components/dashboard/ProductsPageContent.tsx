"use client";

import { useEffect, useState } from "react";

import { ProductList } from "@/components/dashboard/ProductList";
import type { Category } from "@/models/category/Category";
import type { Product } from "@/models/product/Product";
import { categoryService } from "@/services/CategoryService";
import { productService } from "@/services/ProductService";

export function ProductsPageContent({ shopId }: { shopId: string }) {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    let active = true;
    Promise.all([
      productService.listProducts(shopId),
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

  return <ProductList initialProducts={products} categories={categories} />;
}

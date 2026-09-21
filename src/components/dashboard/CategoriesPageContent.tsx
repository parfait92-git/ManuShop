"use client";

import { useEffect, useState } from "react";

import { CategoryManager } from "@/components/dashboard/CategoryManager";
import type { Category } from "@/models/category/Category";
import { categoryService } from "@/services/CategoryService";

export function CategoriesPageContent({ shopId }: { shopId: string }) {
  const [categories, setCategories] = useState<Category[] | null>(null);

  useEffect(() => {
    let active = true;
    categoryService.listCategories(shopId).then((data) => {
      if (active) setCategories(data);
    });
    return () => {
      active = false;
    };
  }, [shopId]);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Catégories</h1>
      {categories === null ? (
        <p className="text-sm text-muted-foreground">Chargement...</p>
      ) : (
        <CategoryManager shopId={shopId} initialCategories={categories} />
      )}
    </div>
  );
}

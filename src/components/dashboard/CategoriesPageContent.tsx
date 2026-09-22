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
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <p className="text-sm font-medium text-primary">
          Configuration du catalogue
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Catégories produits
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Créez des familles claires pour organiser vos produits. Une
          catégorie active pourra être sélectionnée dans le formulaire «
          Nouveau produit ».
        </p>
      </div>

      {categories === null ? (
        <p className="text-sm text-muted-foreground">Chargement...</p>
      ) : (
        <CategoryManager shopId={shopId} initialCategories={categories} />
      )}
    </div>
  );
}

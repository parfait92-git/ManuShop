"use client";

import { useEffect, useState } from "react";

import { CategoryManager } from "@/components/dashboard/CategoryManager";
import { DemoPreviewBanner } from "@/components/dashboard/DemoPreviewBanner";
import { getCategoriesByShop, mockShops } from "@/data/mockData";
import type { Category } from "@/models/category/Category";
import { categoryService } from "@/services/CategoryService";

const DEMO_SHOP = mockShops.find((shop) => shop.id === "shop-mode-237")!;
const DEMO_CATEGORIES = getCategoriesByShop(DEMO_SHOP.id);

/** Aperçu en lecture seule (pas de switch/suppression — voir
 * DemoPreviewBanner) affiché quand la boutique n'a encore aucune vraie
 * catégorie. */
function DemoCategoryPreview() {
  return (
    <div className="flex flex-col gap-4">
      <DemoPreviewBanner
        title="Exemple — à quoi ressembleront vos catégories"
        description={`Aperçu basé sur « ${DEMO_SHOP.name} », une boutique de démonstration. Créez votre première catégorie avec le formulaire ci-dessus pour le remplacer.`}
      />
      <ul className="divide-y divide-border rounded-xl border border-dashed border-border">
        {DEMO_CATEGORIES.map((category) => (
          <li
            key={category.id}
            className="flex items-center justify-between gap-4 px-4 py-3 opacity-80"
          >
            <div className="flex flex-col">
              <span className="text-sm font-medium">{category.name}</span>
              {category.description && (
                <span className="text-sm text-muted-foreground">
                  {category.description}
                </span>
              )}
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {(category.isActive ?? true) ? "Affichée" : "Masquée"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

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
        <>
          <CategoryManager shopId={shopId} initialCategories={categories} />
          {categories.length === 0 && <DemoCategoryPreview />}
        </>
      )}
    </div>
  );
}

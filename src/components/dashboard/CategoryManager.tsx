"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CategorySchema, type CategoryInput } from "@/lib/validation/product";
import type { Category } from "@/models/category/Category";
import { categoryService } from "@/services/CategoryService";

export function CategoryManager({
  shopId,
  initialCategories,
}: {
  shopId: string;
  initialCategories: Category[];
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryInput>({
    resolver: zodResolver(CategorySchema),
  });

  async function onSubmit(data: CategoryInput) {
    const category = await categoryService.createCategory(shopId, data.name);
    setCategories((current) => [...current, category]);
    reset();
  }

  async function handleDelete(category: Category) {
    const confirmed = window.confirm(
      `Supprimer la catégorie « ${category.name} » ?`
    );
    if (!confirmed) return;

    setDeletingId(category.id);
    try {
      await categoryService.deleteCategory(category.id);
      setCategories((current) => current.filter((c) => c.id !== category.id));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex max-w-md flex-col gap-6">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex items-end gap-3"
        noValidate
      >
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="name">Nouvelle catégorie</Label>
          <Input id="name" aria-invalid={!!errors.name} {...register("name")} />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>
        <Button type="submit" disabled={isSubmitting}>
          Ajouter
        </Button>
      </form>

      {categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucune catégorie pour le moment.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {categories.map((category) => (
            <li
              key={category.id}
              className="flex items-center justify-between px-4 py-2.5"
            >
              <span className="text-sm">{category.name}</span>
              <Button
                variant="destructive"
                size="sm"
                disabled={deletingId === category.id}
                onClick={() => handleDelete(category)}
              >
                Supprimer
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { HelpCircle, Info, Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FieldHint } from "@/components/dashboard/FieldHint";
import { CategorySchema, type CategoryInput } from "@/lib/validation/product";
import type { Category } from "@/models/category/Category";
import { activityLogService } from "@/services/ActivityLogService";
import { categoryService } from "@/services/CategoryService";
import { categoryTrashService } from "@/services/TrashService";

function CategoryForm({
  shopId,
  onCreated,
}: {
  shopId: string;
  onCreated: (category: Category) => void;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryInput>({
    resolver: zodResolver(CategorySchema),
    // Non affichée par défaut : une catégorie fraîchement créée n'a
    // généralement pas encore de produit associé — mieux vaut que le
    // commerçant l'active lui-même une fois prête plutôt que de l'exposer
    // aux clients vide dès la création.
    defaultValues: { name: "", description: "", isActive: false },
  });
  const isActive = useWatch({ control, name: "isActive" });

  async function onSubmit(data: CategoryInput) {
    setFormError(null);
    try {
      const category = await categoryService.createCategory(shopId, data);
      onCreated(category);
      reset({ name: "", description: "", isActive: false });
    } catch {
      setFormError("Une erreur est survenue. Veuillez réessayer.");
    }
  }

  return (
    <div className="flex flex-col gap-5 rounded-xl border border-border bg-background p-4 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Plus className="size-4.5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold">Créer une catégorie</h2>
          <p className="text-sm text-muted-foreground">
            Les champs marqués d&apos;un astérisque sont nécessaires.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name" className="gap-1.5">
            Nom de la catégorie <span className="text-destructive">*</span>
            <FieldHint text="Le nom court affiché à vos clients et dans le formulaire produit — ex. Mode, Chaussures, Accessoires." />
          </Label>
          <Input
            id="name"
            placeholder="Ex. Mode"
            aria-invalid={!!errors.name}
            {...register("name")}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="description" className="gap-1.5">
            Description <span className="text-destructive">*</span>
            <FieldHint text="Une phrase qui rappelle ce que contient cette catégorie. Elle vous aide à vous y retrouver, même des mois plus tard." />
          </Label>
          <textarea
            id="description"
            rows={3}
            placeholder="Ex. Vêtements et tenues inspirés du style local"
            aria-invalid={!!errors.description}
            className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:border-input dark:bg-input/30"
            {...register("description")}
          />
          {errors.description && (
            <p className="text-sm text-destructive">
              {errors.description.message}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
          <div>
            <p className="text-sm font-medium">Afficher la catégorie</p>
            <p className="text-sm text-muted-foreground">
              Si elle est affichée, les clients pourront la voir et les
              produits pourront y être associés.
            </p>
          </div>
          <Switch
            checked={isActive}
            onCheckedChange={(checked) => setValue("isActive", checked)}
            aria-label="Afficher la catégorie"
          />
        </div>

        {formError && <p className="text-sm text-destructive">{formError}</p>}

        <Button type="submit" disabled={isSubmitting} className="w-full gap-1.5">
          <Plus className="size-4" />
          {isSubmitting ? "Création..." : "Créer la catégorie"}
        </Button>
      </form>
    </div>
  );
}

function InfoPanel() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-xl bg-primary/5 p-4 sm:p-6">
        <div className="flex items-center gap-2 font-semibold text-primary">
          <Info className="size-4.5" />
          Pourquoi créer des catégories ?
        </div>
        <p className="text-sm text-muted-foreground">
          Elles aident vos clients à parcourir la boutique et vous permettent
          de retrouver rapidement vos produits dans l&apos;espace gérant.
        </p>
        <ol className="flex flex-col gap-2 text-sm text-muted-foreground">
          <li>1. Créez une catégorie avant d&apos;ajouter un produit.</li>
          <li>2. Choisissez ensuite cette catégorie dans le formulaire produit.</li>
          <li>3. Désactivez-la temporairement sans supprimer vos produits.</li>
        </ol>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:p-6">
        <h3 className="font-semibold">Conseils pour débuter</h3>
        <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
          {[
            "Commencez avec 3 à 6 catégories principales.",
            "Évitez les noms trop longs ou qui se ressemblent.",
            "Désactivez une catégorie saisonnière plutôt que de la supprimer.",
          ].map((tip) => (
            <li key={tip} className="flex items-start gap-2">
              <HelpCircle className="mt-0.5 size-4 shrink-0 text-primary" />
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * Seul moyen de renommer/changer la description d'une catégorie déjà créée
 * — jusque-là, il fallait la supprimer et en recréer une (signalé par
 * l'utilisateur). Pas de nouveau formulaire : réutilise `CategorySchema` et
 * `categoryService.updateCategory`, déjà là mais jamais branchés à une UI.
 */
function EditCategoryDialog({
  category,
  open,
  onOpenChange,
  onSaved,
}: {
  category: Category;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (category: Category) => void;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryInput>({
    resolver: zodResolver(CategorySchema),
    values: {
      name: category.name,
      description: category.description ?? "",
      isActive: category.isActive ?? true,
    },
  });

  async function onSubmit(data: CategoryInput) {
    setFormError(null);
    try {
      await categoryService.updateCategory(category.id, {
        name: data.name,
        description: data.description,
      });
      onSaved({ ...category, name: data.name, description: data.description });
      onOpenChange(false);
    } catch {
      setFormError("Une erreur est survenue. Veuillez réessayer.");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogPortal className="max-w-md">
        <DialogTitle>Modifier la catégorie</DialogTitle>
        <DialogDescription>
          Le statut affiché/masqué se change directement depuis la liste.
        </DialogDescription>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-category-name">Nom de la catégorie</Label>
            <Input
              id="edit-category-name"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-category-description">Description</Label>
            <textarea
              id="edit-category-description"
              rows={3}
              aria-invalid={!!errors.description}
              className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:border-input dark:bg-input/30"
              {...register("description")}
            />
            {errors.description && (
              <p className="text-sm text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>

          {formError && <p className="text-sm text-destructive">{formError}</p>}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      </DialogPortal>
    </Dialog>
  );
}

function CategoryRow({
  category,
  onToggle,
  onDelete,
  onEdit,
  toggling,
  deleting,
}: {
  category: Category;
  onToggle: (category: Category) => void;
  onDelete: (category: Category) => void;
  onEdit: (category: Category) => void;
  toggling: boolean;
  deleting: boolean;
}) {
  const isActive = category.isActive ?? true;
  return (
    <li className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
      <div
        className="flex min-w-0 flex-1 cursor-pointer flex-col"
        onDoubleClick={() => onEdit(category)}
        title="Double-cliquez pour modifier"
      >
        <span className="text-sm font-medium">{category.name}</span>
        {category.description && (
          <span className="truncate text-sm text-muted-foreground">
            {category.description}
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-xs font-medium text-muted-foreground">
          {isActive ? "Affichée" : "Masquée"}
        </span>
        <Switch
          checked={isActive}
          disabled={toggling}
          onCheckedChange={() => onToggle(category)}
          aria-label={`${isActive ? "Masquer" : "Afficher"} ${category.name}`}
        />
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onEdit(category)}
          aria-label={`Modifier ${category.name}`}
        >
          <Pencil className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={deleting}
          onClick={() => onDelete(category)}
          aria-label={`Supprimer ${category.name}`}
          className="text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </li>
  );
}

export function CategoryManager({
  shopId,
  initialCategories,
}: {
  shopId: string;
  initialCategories: Category[];
}) {
  const { profile } = useAuth();
  const [categories, setCategories] = useState(initialCategories);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  function handleCreated(category: Category) {
    setCategories((current) => [...current, category]);
    setListError(null);
  }

  function handleSaved(category: Category) {
    setCategories((current) =>
      current.map((c) => (c.id === category.id ? category : c))
    );
  }

  async function handleToggle(category: Category) {
    const nextActive = !(category.isActive ?? true);
    setTogglingId(category.id);
    setListError(null);
    try {
      await categoryService.setCategoryActive(category.id, nextActive);
      setCategories((current) =>
        current.map((c) =>
          c.id === category.id ? { ...c, isActive: nextActive } : c
        )
      );
    } catch {
      // Le switch revient visuellement à son état précédent puisque
      // `categories` n'a pas changé — sans ce message, ça ressemble à un
      // bug silencieux plutôt qu'à un refus (droits, règles Firestore pas
      // encore déployées, réseau...).
      setListError(
        "Impossible de mettre à jour cette catégorie. Réessayez, ou vérifiez que vous avez bien les droits nécessaires."
      );
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(category: Category) {
    const confirmed = window.confirm(
      `Déplacer la catégorie « ${category.name} » vers la corbeille ?`
    );
    if (!confirmed) return;

    setDeletingId(category.id);
    setListError(null);
    try {
      await categoryTrashService.softDelete(category.id);
      if (profile) {
        await activityLogService.logCategoryTrashed(
          { shopId, actorId: profile.id, actorName: profile.displayName },
          category.id,
          category.name
        );
      }
      setCategories((current) => current.filter((c) => c.id !== category.id));
    } catch {
      setListError("Impossible de supprimer cette catégorie. Réessayez.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <CategoryForm shopId={shopId} onCreated={handleCreated} />
        <InfoPanel />
      </div>

      <div className="rounded-xl border border-border bg-background">
        <div className="flex items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-semibold">Vos catégories</h2>
            <p className="text-sm text-muted-foreground">
              {categories.length === 0
                ? "Aucune catégorie pour le moment"
                : `${categories.length} catégorie${categories.length > 1 ? "s" : ""}`}
            </p>
          </div>
          <Tag className="size-5 text-muted-foreground" />
        </div>

        {listError && (
          <p className="border-t border-border px-4 py-3 text-sm text-destructive sm:px-6">
            {listError}
          </p>
        )}

        {categories.length === 0 ? (
          <div className="flex flex-col items-center gap-2 border-t border-border px-6 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Tag className="size-5" />
            </span>
            <p className="font-medium">Votre catalogue est prêt à être organisé</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Créez votre première catégorie avec le formulaire ci-dessus.
              Elle sera ensuite disponible lors de l&apos;ajout d&apos;un
              produit.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border border-t border-border">
            {categories.map((category) => (
              <CategoryRow
                key={category.id}
                category={category}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onEdit={setEditingCategory}
                toggling={togglingId === category.id}
                deleting={deletingId === category.id}
              />
            ))}
          </ul>
        )}
      </div>

      {editingCategory && (
        <EditCategoryDialog
          category={editingCategory}
          open={!!editingCategory}
          onOpenChange={(open) => {
            if (!open) setEditingCategory(null);
          }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Timestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ProductImageUploader } from "@/components/dashboard/ProductImageUploader";
import { useNavigationBlocker } from "@/components/providers/NavigationBlockerProvider";
import {
  ProductSchema,
  type ProductFormValues,
  type ProductInput,
} from "@/lib/validation/product";
import {
  clearProductDraft,
  loadProductDraft,
  saveProductDraft,
} from "@/lib/productDraft";
import type { Category } from "@/models/category/Category";
import type { Product } from "@/models/product/Product";
import { productService } from "@/services/ProductService";

function toDateInputValue(timestamp?: Timestamp): string {
  if (!timestamp) return "";
  return timestamp.toDate().toISOString().slice(0, 10);
}

export function ProductForm({
  shopId,
  categories,
  product,
}: {
  shopId: string;
  categories: Category[];
  product?: Product;
}) {
  const router = useRouter();
  const { guard } = useNavigationBlocker();
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [formError, setFormError] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    getValues,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProductFormValues, unknown, ProductInput>({
    resolver: zodResolver(ProductSchema),
    defaultValues: product
      ? {
          name: product.name,
          description: product.description,
          price: product.price,
          category: product.category,
          stock: product.stock,
          stockThreshold: product.stockThreshold,
          isPromo: product.isPromo,
          promoPrice: product.promoPrice,
          promoEndDate: toDateInputValue(product.promoEnd),
        }
      : {
          isPromo: false,
        },
  });

  const isPromo = useWatch({ control, name: "isPromo" });

  // Brouillon local : uniquement pour la création (BF-06), jamais mélangé à
  // une édition de produit existant. Restauré au montage plutôt que via
  // `defaultValues` pour éviter tout aller-retour serveur/client sur
  // `window.localStorage`.
  useEffect(() => {
    if (product) return;
    const draft = loadProductDraft();
    if (!draft) return;
    queueMicrotask(() => {
      reset(draft.values);
      setImages(draft.images);
      setDraftRestored(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Enregistre l'état "modifications non sauvegardées" auprès du garde de
  // navigation de la sidebar, avec ce qu'il faut faire si l'utilisateur
  // choisit de sauvegarder ou d'abandonner en quittant la page.
  useEffect(() => {
    if (product) return;
    guard(isDirty || images.length > 0, {
      onSave: () => saveProductDraft({ values: getValues(), images }),
      onDiscard: () => clearProductDraft(),
    });
  }, [product, isDirty, images, guard, getValues]);

  useEffect(() => {
    if (product) return;
    return () => guard(false, { onSave: () => {}, onDiscard: () => {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  useEffect(() => {
    if (!draftSaved) return;
    const timeout = setTimeout(() => setDraftSaved(false), 4000);
    return () => clearTimeout(timeout);
  }, [draftSaved]);

  function handleSaveDraft() {
    saveProductDraft({ values: getValues(), images });
    setDraftSaved(true);
  }

  // Seules les catégories actives peuvent être choisies pour un nouveau
  // produit — sauf celle déjà assignée au produit en cours d'édition, pour
  // ne pas la faire disparaître silencieusement si elle a été masquée
  // depuis.
  const availableCategories = categories.filter(
    (cat) => (cat.isActive ?? true) || cat.name === product?.category
  );

  async function onSubmit(data: ProductInput) {
    setFormError(null);
    try {
      const promoFields = data.isPromo
        ? {
            isPromo: true as const,
            promoPrice: data.promoPrice,
            ...(data.promoEndDate
              ? { promoEnd: Timestamp.fromDate(new Date(data.promoEndDate)) }
              : {}),
          }
        : { isPromo: false as const };

      if (product) {
        await productService.updateProduct(product.id, {
          name: data.name,
          description: data.description,
          price: data.price,
          category: data.category,
          stock: data.stock,
          stockThreshold: data.stockThreshold,
          images,
          ...promoFields,
        });
      } else {
        await productService.createProduct({
          shopId,
          name: data.name,
          description: data.description,
          price: data.price,
          category: data.category,
          stock: data.stock,
          stockThreshold: data.stockThreshold,
          images,
          ...promoFields,
        });
        clearProductDraft();
      }

      router.push("/dashboard/products");
    } catch {
      setFormError("Une erreur est survenue. Veuillez réessayer.");
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex w-full max-w-lg flex-col gap-4"
      noValidate
    >
      {draftRestored && (
        <p className="rounded-lg bg-primary/5 px-3 py-2 text-sm text-primary">
          Brouillon restauré — reprenez là où vous vous étiez arrêté(e).
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Nom du produit</Label>
        <Input id="name" aria-invalid={!!errors.name} {...register("name")} />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
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

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="price">Prix (FCFA)</Label>
          <Input
            id="price"
            type="number"
            step="1"
            min="0"
            aria-invalid={!!errors.price}
            {...register("price")}
          />
          {errors.price && (
            <p className="text-sm text-destructive">{errors.price.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="category">Catégorie</Label>
          <Select
            id="category"
            aria-invalid={!!errors.category}
            {...register("category")}
          >
            <option value="">Sélectionner...</option>
            {availableCategories.map((cat) => (
              <option key={cat.id} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </Select>
          {errors.category && (
            <p className="text-sm text-destructive">
              {errors.category.message}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="stock">Stock</Label>
          <Input
            id="stock"
            type="number"
            step="1"
            min="0"
            aria-invalid={!!errors.stock}
            {...register("stock")}
          />
          {errors.stock && (
            <p className="text-sm text-destructive">{errors.stock.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="stockThreshold">Seuil d&apos;alerte</Label>
          <Input
            id="stockThreshold"
            type="number"
            step="1"
            min="0"
            aria-invalid={!!errors.stockThreshold}
            {...register("stockThreshold")}
          />
          {errors.stockThreshold && (
            <p className="text-sm text-destructive">
              {errors.stockThreshold.message}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Photos</Label>
        <ProductImageUploader images={images} onChange={setImages} />
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
        <Label htmlFor="isPromo" className="items-center">
          <input
            id="isPromo"
            type="checkbox"
            className="size-4"
            {...register("isPromo")}
          />
          Produit en promotion
        </Label>

        {isPromo && (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="promoPrice">Prix promo (FCFA)</Label>
              <Input
                id="promoPrice"
                type="number"
                step="1"
                min="0"
                aria-invalid={!!errors.promoPrice}
                {...register("promoPrice")}
              />
              {errors.promoPrice && (
                <p className="text-sm text-destructive">
                  {errors.promoPrice.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="promoEndDate">Fin de la promo</Label>
              <Input
                id="promoEndDate"
                type="date"
                {...register("promoEndDate")}
              />
            </div>
          </div>
        )}
      </div>

      {formError && <p className="text-sm text-destructive">{formError}</p>}

      {!product && (
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveDraft}
            className="w-fit"
          >
            Enregistrer le brouillon
          </Button>
          {draftSaved && (
            <p className="text-sm text-muted-foreground">
              Brouillon sauvegardé dans ce navigateur.
            </p>
          )}
        </div>
      )}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting
          ? "Enregistrement..."
          : product
            ? "Enregistrer les modifications"
            : "Créer le produit"}
      </Button>
    </form>
  );
}

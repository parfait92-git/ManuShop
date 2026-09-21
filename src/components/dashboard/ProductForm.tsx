"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Timestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ProductImageUploader } from "@/components/dashboard/ProductImageUploader";
import {
  ProductSchema,
  type ProductFormValues,
  type ProductInput,
} from "@/lib/validation/product";
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
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
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
            {categories.map((cat) => (
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

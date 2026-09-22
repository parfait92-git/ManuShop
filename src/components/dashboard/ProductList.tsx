"use client";

import Image from "next/image";
import Link from "next/link";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { Category } from "@/models/category/Category";
import type { Product } from "@/models/product/Product";
import { productService, type StockStatus } from "@/services/ProductService";

const STOCK_STATUS_LABEL: Record<StockStatus, string> = {
  "in-stock": "En stock",
  "low-stock": "Stock faible",
  "out-of-stock": "Rupture",
};

const STOCK_STATUS_CLASS: Record<StockStatus, string> = {
  "in-stock": "bg-emerald-50 text-emerald-700",
  "low-stock": "bg-amber-50 text-amber-700",
  "out-of-stock": "bg-red-50 text-red-700",
};

export function ProductList({
  initialProducts,
  categories,
}: {
  initialProducts: Product[];
  categories: Category[];
}) {
  const [products, setProducts] = useState(initialProducts);
  const [term, setTerm] = useState("");
  const [category, setCategory] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const searched = productService.search(products, term);
    return category ? searched.filter((p) => p.category === category) : searched;
  }, [products, term, category]);

  async function handleDelete(product: Product) {
    const confirmed = window.confirm(
      `Supprimer « ${product.name} » ? Cette action est irréversible.`
    );
    if (!confirmed) return;

    setDeletingId(product.id);
    try {
      await productService.deleteProduct(product.id);
      setProducts((current) => current.filter((p) => p.id !== product.id));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">
            Catalogue produits
          </h2>
          <p className="text-sm text-slate-500">
            Gérez vos articles, catégories et niveaux de stock.
          </p>
        </div>
        <Link
          href="/dashboard/products/new"
          className={buttonVariants({ className: "w-fit gap-1.5" })}
        >
          <Plus className="size-4" />
          Ajouter un produit
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Rechercher par nom ou catégorie"
            aria-label="Rechercher un produit"
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 text-sm outline-none placeholder:text-slate-400 focus-visible:border-slate-400"
          />
        </div>
        <Select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          aria-label="Filtrer par catégorie"
          className="h-10 sm:w-56"
        >
          <option value="">Toutes les catégories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.name}>
              {cat.name}
            </option>
          ))}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">
          Aucun produit trouvé.
        </p>
      ) : (
        <div className="-mx-4 overflow-x-auto sm:-mx-6">
          <table className="w-full min-w-160 border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold tracking-wide text-slate-400 uppercase">
                <th className="px-4 py-2 sm:px-6">Produit</th>
                <th className="px-4 py-2">Catégorie</th>
                <th className="px-4 py-2">Prix</th>
                <th className="px-4 py-2">Stock</th>
                <th className="px-4 py-2">Statut</th>
                <th className="px-4 py-2 text-right sm:pr-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((product) => {
                const status = productService.getStockStatus(product);
                return (
                  <tr key={product.id}>
                    <td className="px-4 py-3 sm:px-6">
                      <div className="flex items-center gap-3">
                        <div className="relative size-11 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                          {product.images[0] && (
                            <Image
                              src={product.images[0]}
                              alt=""
                              fill
                              sizes="44px"
                              className="object-cover"
                            />
                          )}
                        </div>
                        <span className="font-medium text-slate-900">
                          {product.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                      {product.price.toLocaleString("fr-FR")} FCFA
                    </td>
                    <td className="px-4 py-3 text-slate-700">{product.stock}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${STOCK_STATUS_CLASS[status]}`}
                      >
                        {STOCK_STATUS_LABEL[status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 sm:pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/dashboard/products/${product.id}/edit`}
                          aria-label={`Modifier ${product.name}`}
                          className="flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                        >
                          <Pencil className="size-4" />
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Supprimer ${product.name}`}
                          disabled={deletingId === product.id}
                          onClick={() => handleDelete(product)}
                          className="text-red-500 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

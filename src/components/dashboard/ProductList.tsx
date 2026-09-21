"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Product } from "@/models/product/Product";
import { productService } from "@/services/ProductService";

export function ProductList({
  initialProducts,
}: {
  initialProducts: Product[];
}) {
  const [products, setProducts] = useState(initialProducts);
  const [term, setTerm] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(
    () => productService.search(products, term),
    [products, term]
  );

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
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <Input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Rechercher par nom ou catégorie..."
          aria-label="Rechercher un produit"
          className="max-w-sm"
        />
        <Button render={<Link href="/dashboard/products/new" />}>
          Nouveau produit
        </Button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun produit trouvé.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {filtered.map((product) => (
            <li
              key={product.id}
              className="flex items-center gap-4 px-4 py-3"
            >
              <div className="relative size-12 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
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

              <div className="flex flex-1 flex-col">
                <span className="text-sm font-medium">{product.name}</span>
                <span className="text-sm text-muted-foreground">
                  {product.category} · Stock : {product.stock}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {product.isPromo && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    Promo
                  </span>
                )}
                <span className="text-sm font-medium">
                  {product.price.toLocaleString("fr-FR")} FCFA
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  render={
                    <Link href={`/dashboard/products/${product.id}/edit`} />
                  }
                >
                  Modifier
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={deletingId === product.id}
                  onClick={() => handleDelete(product)}
                >
                  Supprimer
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

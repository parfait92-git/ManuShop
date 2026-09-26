"use client";

import { useParams } from "next/navigation";

import { ProductDetailPageContent } from "@/components/storefront/ProductDetailPageContent";

export default function ProductDetailPage() {
  const params = useParams<{ productId: string }>();

  return <ProductDetailPageContent productId={params.productId} />;
}

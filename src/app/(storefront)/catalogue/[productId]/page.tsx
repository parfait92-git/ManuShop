"use client";

import { useParams } from "next/navigation";

import { ProductDetailPageContent } from "@/components/storefront/ProductDetailPageContent";
import { PageTour } from "@/components/onboarding/PageTour";

export default function ProductDetailPage() {
  const params = useParams<{ productId: string }>();

  return (
    <>
      <PageTour tourId="storefront-product" />
      <ProductDetailPageContent productId={params.productId} />
    </>
  );
}

import { ShopBrandingProvider } from "@/components/providers/ShopBrandingProvider";
import { StorefrontFooter } from "@/components/storefront/StorefrontFooter";
import { StorefrontHeader } from "@/components/storefront/StorefrontHeader";

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ShopBrandingProvider>
      <div className="flex min-h-svh flex-col">
        <StorefrontHeader />
        <main className="flex-1">{children}</main>
        <StorefrontFooter />
      </div>
    </ShopBrandingProvider>
  );
}

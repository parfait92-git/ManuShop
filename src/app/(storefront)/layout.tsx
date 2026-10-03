import { ShopBrandingProvider } from "@/components/providers/ShopBrandingProvider";
import { StorefrontFooter } from "@/components/storefront/StorefrontFooter";
import { StorefrontHeader } from "@/components/storefront/StorefrontHeader";
import { StorefrontThemeScope } from "@/components/providers/StorefrontThemeScope";

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ShopBrandingProvider>
      <StorefrontThemeScope>
        <StorefrontHeader />
        <main className="flex-1">{children}</main>
        <StorefrontFooter />
      </StorefrontThemeScope>
    </ShopBrandingProvider>
  );
}

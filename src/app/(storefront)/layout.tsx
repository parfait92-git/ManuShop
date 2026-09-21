import { StorefrontHeader } from "@/components/storefront/StorefrontHeader";

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <StorefrontHeader />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} ManuShop · Des commerces locaux, une
        expérience unique.
      </footer>
    </div>
  );
}

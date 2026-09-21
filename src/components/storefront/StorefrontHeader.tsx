"use client";

import { Bell, ShoppingBag, Store, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { CartPanel } from "@/components/storefront/CartPanel";
import { useCartItemCount } from "@/store/cartStore";

// Pas de page /promotions dédiée pour l'instant (aucune maquette fournie) :
// le lien réutilise le catalogue avec le filtre promo pré-appliqué plutôt
// que de pointer vers une page inexistante.
const NAV_LINKS = [
  { href: "/", label: "Accueil" },
  { href: "/catalogue", label: "Catalogue" },
  { href: "/catalogue?promo=1", label: "Promotions" },
] as const;

export function StorefrontHeader() {
  const pathname = usePathname();
  const [cartOpen, setCartOpen] = useState(false);
  const itemCount = useCartItemCount();

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex size-7 items-center justify-center rounded-full bg-primary/10">
            <Store className="size-4 text-primary" />
          </span>
          Manu <span className="text-primary">Shop</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm sm:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                pathname === link.href
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Notifications"
            className="flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground"
          >
            <Bell className="size-4" />
          </button>
          <Link
            href="/login"
            aria-label="Mon compte"
            className="flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground"
          >
            <User className="size-4" />
          </Link>
          <div className="relative">
            <button
              type="button"
              aria-label="Voir le panier"
              onClick={() => setCartOpen((open) => !open)}
              className="relative flex size-9 items-center justify-center rounded-full bg-foreground text-background"
            >
              <ShoppingBag className="size-4" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                  {itemCount}
                </span>
              )}
            </button>
            {cartOpen && <CartPanel onClose={() => setCartOpen(false)} />}
          </div>
        </div>
      </div>
    </header>
  );
}

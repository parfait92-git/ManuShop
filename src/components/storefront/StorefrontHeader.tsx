"use client";

import { Bell, ChevronDown, ShoppingBag, Store, User } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/components/providers/AuthProvider";
import { CartPanel } from "@/components/storefront/CartPanel";
import { CreateShopWizard } from "@/components/storefront/CreateShopWizard";
import { authService } from "@/services/AuthService";
import { useCartItemCount } from "@/store/cartStore";

// Pas de page /promotions dédiée pour l'instant (aucune maquette fournie) :
// le lien réutilise le catalogue avec le filtre promo pré-appliqué plutôt
// que de pointer vers une page inexistante.
const NAV_LINKS = [
  { href: "/", label: "Accueil" },
  { href: "/catalogue", label: "Catalogue" },
  { href: "/catalogue?promo=1", label: "Promotions" },
] as const;

function AccountMenu() {
  const { firebaseUser, profile } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);

  // Non connecté : simple lien vers /login (GuestRoute s'occupe de renvoyer
  // un visiteur déjà connecté ailleurs — inutile de dupliquer cette logique
  // ici, mais il ne faut surtout pas y pointer quand on EST connecté, sans
  // quoi ce lien rebondit systématiquement sur /erreur?code=already-authenticated).
  if (!firebaseUser) {
    return (
      <Link
        href="/login"
        aria-label="Mon compte"
        className="flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground"
      >
        <User className="size-4" />
      </Link>
    );
  }

  async function handleLogout() {
    await authService.logout();
    router.push("/");
  }

  const canManageShop = profile?.role === "admin" || profile?.role === "seller";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Mon compte"
        className="flex h-9 items-center gap-1 rounded-full border border-border px-2 text-muted-foreground hover:text-foreground"
      >
        <User className="size-4" />
        <ChevronDown className="size-3.5" />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-border bg-background py-2 shadow-lg">
            <div className="px-3 py-1.5">
              <p className="truncate text-sm font-medium">
                {profile?.displayName ?? firebaseUser.displayName ?? "Mon compte"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {profile?.email ?? profile?.phone ?? firebaseUser.email ?? ""}
              </p>
            </div>
            {canManageShop && (
              <Link
                href="/dashboard"
                className="block px-3 py-2 text-sm text-foreground hover:bg-muted"
                onClick={() => setOpen(false)}
              >
                Tableau de bord
              </Link>
            )}
            {/* BF-79 : accessible à tout client connecté — pas seulement
            admin/vendeur, contrairement à "Tableau de bord" ci-dessus. */}
            {profile?.role === "client" && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setWizardOpen(true);
                }}
                className="block w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
              >
                Créer ma boutique
              </button>
            )}
            <Link
              href="/mes-commandes"
              className="block px-3 py-2 text-sm text-foreground hover:bg-muted"
              onClick={() => setOpen(false)}
            >
              Mes commandes
            </Link>
            <Link
              href="/mon-compte"
              className="block px-3 py-2 text-sm text-foreground hover:bg-muted"
              onClick={() => setOpen(false)}
            >
              Paramètres du compte
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="block w-full px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted"
            >
              Se déconnecter
            </button>
          </div>
        </>
      )}

      <CreateShopWizard open={wizardOpen} onOpenChange={setWizardOpen} />
    </div>
  );
}

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
          <AccountMenu />
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

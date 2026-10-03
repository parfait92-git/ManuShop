"use client";

import { ChevronDown, ShoppingBag, Store, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/components/providers/AuthProvider";
import { useShopBranding } from "@/components/providers/ShopBrandingProvider";
import { CartPanel } from "@/components/storefront/CartPanel";
import { CreateShopWizard } from "@/components/storefront/CreateShopWizard";
import { NotificationBell } from "@/components/storefront/NotificationBell";
import { TourReplayButton } from "@/components/onboarding/TourReplayButton";
import { authService } from "@/services/AuthService";
import { useCartItemCount } from "@/store/cartStore";
import { isOptimizableImage } from "@/lib/imageHosts";

// Pas de page /promotions dédiée pour l'instant (aucune maquette fournie) :
// le lien réutilise le catalogue avec le filtre promo pré-appliqué plutôt
// que de pointer vers une page inexistante.
const NAV_LINKS = [
  { href: "/", label: "Accueil" },
  { href: "/catalogue", label: "Catalogue" },
  { href: "/catalogue?promo=1", label: "Promotions" },
] as const;

function AccountMenu() {
  const { firebaseUser, profile, isSuperAdmin } = useAuth();
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
        data-tour="storefront-account"
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
  const displayName = profile?.displayName ?? firebaseUser.displayName ?? "Mon compte";
  const photoURL = profile?.photoURL ?? firebaseUser.photoURL ?? undefined;

  return (
    <div className="relative">
      <button
        data-tour="storefront-account"
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Mon compte"
        className="flex h-9 items-center gap-1.5 rounded-full border border-border pr-2 pl-1 text-muted-foreground hover:text-foreground"
      >
        {photoURL ? (
          <Image
            src={photoURL}
            alt=""
            width={28}
            height={28}
            className="size-7 rounded-full object-cover"
          />
        ) : (
          <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {displayName.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="hidden max-w-24 truncate text-sm font-medium text-foreground sm:block">
          {displayName}
        </span>
        <ChevronDown className="hidden size-3.5 sm:block" />
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
            {/* `isSuperAdmin` ne se déduit jamais de `profile.role` (voir
            SuperAdminRoute) — un compte peut être à la fois Super Admin ET
            gérant d'une boutique, auquel cas rien d'autre ici ne montre ce
            privilège : seul moyen d'atteindre /super-admin sinon était de
            connaître l'URL. */}
            {isSuperAdmin && (
              <Link
                href="/super-admin"
                className="block px-3 py-2 text-sm text-foreground hover:bg-muted"
                onClick={() => setOpen(false)}
              >
                Super Admin
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
              href="/mes-favoris"
              className="block px-3 py-2 text-sm text-foreground hover:bg-muted"
              onClick={() => setOpen(false)}
            >
              Mes favoris
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
  const { branding } = useShopBranding();

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background">
      {/* Petits écrans et police agrandie : marges réduites, logo qui se
      tronque plutôt que de pousser les boutons hors de l'écran ; si même
      les boutons ne tiennent plus (320 px, police à 150 %), ils passent à
      la ligne au lieu de chevaucher le logo. */}
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3 sm:flex-nowrap sm:px-6">
        {branding ? (
          <Link
            href={`/boutique/${branding.shopId}`}
            className="flex min-w-0 flex-[1_1_4rem] items-center gap-2 font-semibold"
          >
            {branding.logo ? (
              <Image
                src={branding.logo}
                alt=""
                width={28}
                height={28}
                className="size-7 shrink-0 rounded-full object-cover"
                // Voir ShopSummaryCard : le logo peut venir d'une URL
                // externe collée à la main, pas seulement d'un upload
                // Cloudinary.
                unoptimized={!isOptimizableImage(branding.logo)}
              />
            ) : (
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Store className="size-4 text-primary" />
              </span>
            )}
            <span className="truncate">{branding.name}</span>
          </Link>
        ) : (
          <Link href="/" className="flex min-w-0 flex-[1_1_4rem] items-center gap-2 font-semibold">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Store className="size-4 text-primary" />
            </span>
            <span className="truncate">
              Manu <span className="text-primary">Shop</span>
            </span>
          </Link>
        )}

        <nav data-tour="storefront-nav" className="hidden items-center gap-6 text-sm sm:flex">
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

        <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-1.5 sm:shrink-0 sm:flex-nowrap sm:gap-2">
          <TourReplayButton className="border-border text-muted-foreground hover:bg-muted hover:text-foreground" />
          <NotificationBell />
          <AccountMenu />
          <div className="relative">
            <button
              data-tour="storefront-cart"
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

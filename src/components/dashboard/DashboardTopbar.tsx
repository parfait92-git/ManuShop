"use client";

import { Bell, ChevronDown, ExternalLink, Menu } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/components/providers/AuthProvider";
import { TourReplayButton } from "@/components/onboarding/TourReplayButton";
import { useCurrentShop } from "@/hooks/useCurrentShop";
import { useNewOrdersCount } from "@/hooks/useNewOrdersCount";
import { shopPath } from "@/lib/seo";
import { authService } from "@/services/AuthService";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administratrice",
  seller: "Vendeur",
  client: "Client",
};

export function DashboardTopbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { profile, isSuperAdmin } = useAuth();
  const { shop } = useCurrentShop();
  const newOrdersCount = useNewOrdersCount(profile?.shopId);
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const shopName = shop?.name ?? null;

  async function handleLogout() {
    await authService.logout();
    router.push("/login");
  }

  return (
    <header className="flex items-center justify-between gap-2 border-b border-shell-border bg-shell-surface px-4 py-4 sm:gap-4 sm:px-6">
      {/* Petits écrans et police agrandie : le nom se tronque, les boutons
      de droite gardent leur taille (audit à 320 px / 150 %, voir
      06-journal-progression.md). */}
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Ouvrir le menu"
          className="rounded-lg p-1.5 text-shell-muted hover:bg-shell-hover md:hidden"
        >
          <Menu className="size-5" />
        </button>
        <div className="min-w-0">
          <p className="truncate text-xs text-shell-subtle">Espace gérant</p>
          <p className="truncate text-sm font-semibold text-shell-text sm:text-base">
            {shopName ?? "Ma boutique"}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-4">
        <TourReplayButton />
        {/* Le site de la boutique, tel que ses clients le voient. */}
        {profile?.shopId && (
          <Link
            href={shopPath(profile.shopId)}
            target="_blank"
            data-tour="topbar-view-shop"
            aria-label="Voir ma boutique (nouvel onglet)"
            className="flex h-9 items-center gap-1.5 rounded-full border border-shell-border px-3 text-sm font-medium text-shell-text hover:bg-shell-hover"
          >
            <ExternalLink className="size-4" aria-hidden />
            <span className="hidden lg:inline">Voir ma boutique</span>
          </Link>
        )}
        <Link
          href="/dashboard/orders?status=under_review"
          aria-label={
            newOrdersCount > 0
              ? `${newOrdersCount} nouvelle${newOrdersCount > 1 ? "s" : ""} commande${newOrdersCount > 1 ? "s" : ""} à traiter`
              : "Aucune nouvelle commande"
          }
          className="relative flex size-9 items-center justify-center rounded-full border border-shell-border text-shell-muted hover:bg-shell-hover"
        >
          <Bell className="size-4" />
          {newOrdersCount > 0 && (
            <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-shell-alert text-[10px] font-medium text-shell-alert-text">
              {newOrdersCount > 9 ? "9+" : newOrdersCount}
            </span>
          )}
        </Link>

        {profile && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex items-center gap-2 rounded-full py-1 pr-1 pl-1 hover:bg-shell-hover"
            >
              {profile.photoURL ? (
                <Image
                  src={profile.photoURL}
                  alt=""
                  width={32}
                  height={32}
                  className="size-8 rounded-full object-cover"
                />
              ) : (
                <span className="flex size-8 items-center justify-center rounded-full bg-shell-avatar text-xs font-semibold text-shell-avatar-text">
                  {profile.displayName.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="hidden text-left sm:block">
                <span className="block text-sm font-medium text-shell-text">
                  {profile.displayName}
                </span>
                <span className="block text-xs text-shell-subtle">
                  {ROLE_LABELS[profile.role]}
                </span>
              </span>
              <ChevronDown className="hidden size-3.5 text-shell-subtle sm:block" />
            </button>

            {menuOpen && (
              <>
                <button
                  type="button"
                  aria-hidden
                  tabIndex={-1}
                  className="fixed inset-0 z-10 cursor-default"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 z-20 mt-2 w-48 rounded-lg border border-shell-border bg-shell-surface py-1 shadow-lg">
                  {/* Compte à la fois Super Admin (`platformAdmins`) et
                  gérant d'une boutique (`role: "admin"`) : `isSuperAdmin`
                  ne se déduit jamais de `profile.role` (voir
                  SuperAdminRoute), donc rien ici ne montrait ce privilège
                  avant — seul moyen d'atteindre /super-admin était de
                  connaître l'URL. */}
                  {isSuperAdmin && (
                    <Link
                      href="/super-admin"
                      onClick={() => setMenuOpen(false)}
                      className="block px-3 py-2 text-sm text-shell-muted hover:bg-shell-hover"
                    >
                      Super Admin
                    </Link>
                  )}
                  <Link
                    href="/mon-compte"
                    onClick={() => setMenuOpen(false)}
                    className="block px-3 py-2 text-sm text-shell-muted hover:bg-shell-hover"
                  >
                    Paramètres du compte
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full px-3 py-2 text-left text-sm text-shell-muted hover:bg-shell-hover"
                  >
                    Déconnexion
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

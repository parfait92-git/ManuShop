"use client";

import { Bell, ChevronDown, Menu } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/providers/AuthProvider";
import { authService } from "@/services/AuthService";
import { shopService } from "@/services/ShopService";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administratrice",
  seller: "Vendeur",
  client: "Client",
};

export function DashboardTopbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { profile } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [shopName, setShopName] = useState<string | null>(null);

  // La boutique DE CET admin/vendeur (via son propre `shopId`), pas
  // `useShop()`/`getPrimaryShop()` — ce dernier renvoie "la première
  // boutique de la base", sans rapport avec l'utilisateur connecté, ce qui
  // affichait le nom de la boutique d'un tout autre compte.
  useEffect(() => {
    if (!profile?.shopId) {
      queueMicrotask(() => setShopName(null));
      return;
    }
    let active = true;
    shopService.getShop(profile.shopId).then((shop) => {
      if (active) setShopName(shop?.name ?? null);
    });
    return () => {
      active = false;
    };
  }, [profile?.shopId]);

  async function handleLogout() {
    await authService.logout();
    router.push("/login");
  }

  return (
    <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Ouvrir le menu"
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 md:hidden"
        >
          <Menu className="size-5" />
        </button>
        <div>
          <p className="text-xs text-slate-400">Espace gérant</p>
          <p className="text-sm font-semibold text-slate-950 sm:text-base">
            {shopName ?? "Ma boutique"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <button
          type="button"
          disabled
          aria-label="Notifications (bientôt disponible)"
          title="Notifications — bientôt disponible"
          className="flex size-9 items-center justify-center rounded-full border border-slate-200 text-slate-400 disabled:cursor-not-allowed"
        >
          <Bell className="size-4" />
        </button>

        {profile && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex items-center gap-2 rounded-full py-1 pr-1 pl-1 hover:bg-slate-100"
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
                <span className="flex size-8 items-center justify-center rounded-full bg-cyan-100 text-xs font-semibold text-cyan-700">
                  {profile.displayName.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="hidden text-left sm:block">
                <span className="block text-sm font-medium text-slate-950">
                  {profile.displayName}
                </span>
                <span className="block text-xs text-slate-400">
                  {ROLE_LABELS[profile.role]}
                </span>
              </span>
              <ChevronDown className="hidden size-3.5 text-slate-400 sm:block" />
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
                <div className="absolute right-0 z-20 mt-2 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"
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

"use client";

import {
  LayoutGrid,
  Package,
  ShoppingBag,
  Tag,
  Users,
  BarChart3,
  Settings,
  UserCog,
  Store,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/components/providers/AuthProvider";
import { useNavigationBlocker } from "@/components/providers/NavigationBlockerProvider";
import { cn } from "cn";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutGrid;
  adminOnly?: boolean;
}

const MAIN_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutGrid },
  { href: "/dashboard/products", label: "Produits", icon: Package },
  { href: "/dashboard/categories", label: "Catégories", icon: Tag },
  { href: "/dashboard/orders", label: "Commandes", icon: ShoppingBag },
  { href: "/dashboard/clients", label: "Clients", icon: Users },
];

const CONFIG_ITEMS: NavItem[] = [
  { href: "/dashboard/stats", label: "Statistiques", icon: BarChart3 },
  { href: "/dashboard/shop", label: "Paramètres", icon: Settings, adminOnly: true },
  { href: "/dashboard/team", label: "Équipe", icon: UserCog, adminOnly: true },
];

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  const { isDirty, blockNavigation } = useNavigationBlocker();

  return (
    <Link
      href={item.href}
      onNavigate={(event) => {
        if (!isDirty) return;
        event.preventDefault();
        blockNavigation(item.href);
      }}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-slate-900 text-white"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
      )}
    >
      <Icon className="size-4.5 shrink-0" />
      {item.label}
    </Link>
  );
}

export function DashboardSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  return (
    <div
      className="flex h-full w-64 shrink-0 flex-col border-r border-slate-200 bg-white"
      onClick={onNavigate}
    >
      <div className="flex items-center gap-2 border-b border-slate-200 px-6 py-5">
        <span
          aria-hidden
          className="flex size-8 items-center justify-center rounded-full bg-slate-950"
        >
          <Store className="size-4 text-cyan-300" />
        </span>
        <span className="text-base font-semibold tracking-tight text-slate-950">
          Manu <span className="text-cyan-500">Shop</span>
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-6">
        <div className="flex flex-col gap-1">
          <span className="px-3 pb-2 text-[0.65rem] font-semibold tracking-widest text-slate-400 uppercase">
            Menu principal
          </span>
          {MAIN_ITEMS.map((item) => (
            <NavLink key={item.href} item={item} active={pathname === item.href} />
          ))}
        </div>

        <div className="flex flex-col gap-1">
          <span className="px-3 pb-2 text-[0.65rem] font-semibold tracking-widest text-slate-400 uppercase">
            Configuration
          </span>
          {CONFIG_ITEMS.filter((item) => !item.adminOnly || isAdmin).map((item) => (
            <NavLink key={item.href} item={item} active={pathname === item.href} />
          ))}
        </div>
      </nav>

      <div className="m-4 rounded-xl bg-cyan-50 p-4 text-sm">
        <p className="font-semibold text-cyan-900">Votre boutique est active</p>
        <p className="mt-1 text-cyan-800/80">
          Continuez à ajouter vos articles pour développer vos ventes.
        </p>
      </div>
    </div>
  );
}

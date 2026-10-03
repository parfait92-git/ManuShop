"use client";

import {
  LayoutGrid,
  Mail,
  Package,
  ShoppingBag,
  Tag,
  Users,
  BarChart3,
  Settings,
  UserCog,
  Store,
  Building2,
  Trash2,
  History,
  MessageSquareText,
  Palette,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/components/providers/AuthProvider";
import { useNavigationBlocker } from "@/components/providers/NavigationBlockerProvider";
import { useUnrepliedFeedbackCount } from "@/hooks/useUnrepliedFeedbackCount";
import { cn } from "cn";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutGrid;
  adminOnly?: boolean;
  /** Ancre ciblée par un tour guidé (BF-134/BF-135, `GuidedTour`), ex.
   * "nav-products" — absent des items non référencés par un tour. */
  dataTour?: string;
}

const MAIN_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutGrid },
  {
    href: "/dashboard/products",
    label: "Produits",
    icon: Package,
    dataTour: "nav-products",
  },
  { href: "/dashboard/categories", label: "Catégories", icon: Tag },
  {
    href: "/dashboard/orders",
    label: "Commandes",
    icon: ShoppingBag,
    dataTour: "nav-orders",
  },
  { href: "/dashboard/clients", label: "Clients", icon: Users },
  {
    href: "/dashboard/avis",
    label: "Avis clients",
    icon: MessageSquareText,
    dataTour: "nav-feedback",
  },
  { href: "/dashboard/trash", label: "Corbeille", icon: Trash2 },
  { href: "/dashboard/activity", label: "Journal d'activité", icon: History },
  { href: "/dashboard/support", label: "Contacter le Super Admin", icon: Mail },
];

const CONFIG_ITEMS: NavItem[] = [
  { href: "/dashboard/stats", label: "Statistiques", icon: BarChart3, adminOnly: true },
  { href: "/dashboard/shops", label: "Mes boutiques", icon: Building2, adminOnly: true },
  {
    href: "/dashboard/shop",
    label: "Paramètres",
    icon: Settings,
    adminOnly: true,
    dataTour: "nav-shop-settings",
  },
  { href: "/dashboard/team", label: "Équipe", icon: UserCog, adminOnly: true },
  {
    href: "/dashboard/themes",
    label: "Thèmes",
    icon: Palette,
    adminOnly: true,
    dataTour: "nav-themes",
  },
];

function NavLink({
  item,
  active,
  badge = 0,
}: {
  item: NavItem;
  active: boolean;
  /** Pastille de compteur (ex. avis sans réponse), masquée à 0. */
  badge?: number;
}) {
  const Icon = item.icon;
  const { isDirty, blockNavigation } = useNavigationBlocker();

  return (
    <Link
      href={item.href}
      data-tour={item.dataTour}
      onNavigate={(event) => {
        if (!isDirty) return;
        event.preventDefault();
        blockNavigation(item.href);
      }}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-shell-active text-shell-active-text"
          : "text-shell-muted hover:bg-shell-hover hover:text-shell-text"
      )}
    >
      <Icon className="size-4.5 shrink-0" />
      <span className="min-w-0 flex-1">{item.label}</span>
      {badge > 0 && (
        <span
          aria-label={`${badge} sans réponse`}
          className="rounded-full bg-shell-badge px-1.5 py-0.5 text-[0.65rem] font-semibold text-shell-badge-text"
        >
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}

export function DashboardSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const unrepliedFeedback = useUnrepliedFeedbackCount(profile?.shopId);

  return (
    <div
      className="flex h-full w-64 shrink-0 flex-col border-r border-shell-border bg-shell-surface"
      onClick={onNavigate}
    >
      <div className="flex items-center gap-2 border-b border-shell-border px-6 py-5">
        <span
          aria-hidden
          className="flex size-8 items-center justify-center rounded-full bg-shell-brand"
        >
          <Store className="size-4 text-shell-brand-icon" />
        </span>
        <span className="text-base font-semibold tracking-tight text-shell-text">
          Manu <span className="text-shell-brand-accent">Shop</span>
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-6">
        <div className="flex flex-col gap-1">
          <span className="px-3 pb-2 text-[0.65rem] font-semibold tracking-widest text-shell-subtle uppercase">
            Menu principal
          </span>
          {MAIN_ITEMS.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={pathname === item.href}
              badge={item.href === "/dashboard/avis" ? unrepliedFeedback : 0}
            />
          ))}
        </div>

        <div className="flex flex-col gap-1">
          <span className="px-3 pb-2 text-[0.65rem] font-semibold tracking-widest text-shell-subtle uppercase">
            Configuration
          </span>
          {CONFIG_ITEMS.filter((item) => !item.adminOnly || isAdmin).map((item) => (
            <NavLink key={item.href} item={item} active={pathname === item.href} />
          ))}
        </div>
      </nav>

      <div className="m-4 rounded-xl bg-shell-promo p-4 text-sm">
        <p className="font-semibold text-shell-promo-title">Votre boutique est active</p>
        <p className="mt-1 text-shell-promo-text">
          Continuez à ajouter vos articles pour développer vos ventes.
        </p>
      </div>
    </div>
  );
}

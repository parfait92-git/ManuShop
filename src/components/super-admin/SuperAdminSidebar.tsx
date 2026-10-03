"use client";

import { Crown, Mail, Settings, ShieldCheck, Store, Tag, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "cn";
import { useNewSupportMessagesCount } from "@/hooks/useNewSupportMessagesCount";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Users;
}

const MAIN_ITEMS: NavItem[] = [
  { href: "/super-admin", label: "Comptes", icon: Users },
  { href: "/super-admin/commercants", label: "Commerçants", icon: Store },
  { href: "/super-admin/tags", label: "Tags de catégorie", icon: Tag },
  { href: "/super-admin/offres-premium", label: "Offres premium", icon: Crown },
  { href: "/super-admin/messages", label: "Messages", icon: Mail },
  { href: "/super-admin/reglages", label: "Réglages", icon: Settings },
];

function NavLink({
  item,
  active,
  badge,
}: {
  item: NavItem;
  active: boolean;
  badge?: number;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-slate-900 text-white"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
      )}
    >
      <Icon className="size-4.5 shrink-0" />
      {item.label}
      {!!badge && (
        <span
          className="ml-auto flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[0.65rem] font-semibold text-white"
          aria-label={`${badge} message${badge > 1 ? "s" : ""} en attente`}
        >
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </Link>
  );
}

export function SuperAdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const newMessagesCount = useNewSupportMessagesCount();

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
          <ShieldCheck className="size-4 text-cyan-300" />
        </span>
        <div className="flex flex-col leading-tight">
          <span className="text-base font-semibold tracking-tight text-slate-950">
            Manu <span className="text-cyan-500">Shop</span>
          </span>
          <span className="text-[0.65rem] font-semibold tracking-widest text-slate-400 uppercase">
            Super Admin
          </span>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-6">
        <div className="flex flex-col gap-1">
          <span className="px-3 pb-2 text-[0.65rem] font-semibold tracking-widest text-slate-400 uppercase">
            Plateforme
          </span>
          {MAIN_ITEMS.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={pathname === item.href}
              badge={item.href === "/super-admin/messages" ? newMessagesCount : undefined}
            />
          ))}
        </div>
      </nav>
    </div>
  );
}

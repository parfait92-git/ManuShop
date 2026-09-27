"use client";

import { X } from "lucide-react";
import { useState } from "react";

import { SuperAdminRoute } from "@/components/auth/SuperAdminRoute";
import { SuperAdminSidebar } from "@/components/super-admin/SuperAdminSidebar";
import { SuperAdminTopbar } from "@/components/super-admin/SuperAdminTopbar";

/**
 * Coquille commune à toutes les pages `/super-admin/*` (même motif que
 * `DashboardShell` pour `/dashboard/*`) — barre latérale, en-tête, menu
 * mobile. Vit dans `layout.tsx` (rendu autour de `{children}`) plutôt que
 * dupliquée dans chaque `page.tsx`.
 */
export function SuperAdminShell({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <SuperAdminRoute>
      <div className="flex h-svh bg-slate-50">
        <div className="hidden md:block">
          <SuperAdminSidebar />
        </div>

        {mobileNavOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <button
              type="button"
              aria-label="Fermer le menu"
              className="absolute inset-0 bg-slate-950/40"
              onClick={() => setMobileNavOpen(false)}
            />
            <div className="relative flex h-full">
              <SuperAdminSidebar onNavigate={() => setMobileNavOpen(false)} />
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                aria-label="Fermer le menu"
                className="mt-4 ml-2 flex size-8 items-center justify-center rounded-full bg-white text-slate-600 shadow"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          <SuperAdminTopbar onMenuClick={() => setMobileNavOpen(true)} />
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </SuperAdminRoute>
  );
}

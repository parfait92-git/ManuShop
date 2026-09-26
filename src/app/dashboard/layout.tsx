"use client";

import { X } from "lucide-react";
import { useState } from "react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/components/providers/AuthProvider";
import { CreateShopPrompt } from "@/components/dashboard/CreateShopPrompt";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardTopbar } from "@/components/dashboard/DashboardTopbar";
import { PublicationBanner } from "@/components/dashboard/PublicationBanner";
import { NavigationBlockerProvider } from "@/components/providers/NavigationBlockerProvider";

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // ProtectedRoute garantit déjà un profil admin/vendeur à ce stade — mais
  // pas forcément une boutique : un admin obtenu par attribution manuelle ou
  // abonnement (Module 12) n'en a pas encore créé une.
  if (profile && !profile.shopId) {
    return <CreateShopPrompt />;
  }

  return (
    <div className="flex h-svh bg-slate-50">
      <div className="hidden md:block">
        <DashboardSidebar />
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
            <DashboardSidebar onNavigate={() => setMobileNavOpen(false)} />
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
        <DashboardTopbar onMenuClick={() => setMobileNavOpen(true)} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <PublicationBanner />
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NavigationBlockerProvider>
      <ProtectedRoute allowedRoles={["admin", "seller"]}>
        <DashboardShell>{children}</DashboardShell>
      </ProtectedRoute>
    </NavigationBlockerProvider>
  );
}

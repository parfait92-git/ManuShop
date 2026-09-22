"use client";

import { useRouter } from "next/navigation";

import { SuperAdminRoute } from "@/components/auth/SuperAdminRoute";
import { SuperAdminPanel } from "@/components/super-admin/SuperAdminPanel";
import { Button } from "@/components/ui/button";
import { authService } from "@/services/AuthService";

export default function SuperAdminPage() {
  const router = useRouter();

  async function handleLogout() {
    await authService.logout();
    router.push("/login");
  }

  return (
    <SuperAdminRoute>
      <div className="min-h-svh bg-muted/30">
        <header className="flex items-center justify-between border-b border-border bg-background px-4 py-3 sm:px-6">
          <span className="font-semibold tracking-tight">
            Manu <span className="text-primary">Shop</span> — Super Admin
          </span>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Déconnexion
          </Button>
        </header>
        <main className="px-4 py-10 sm:px-6">
          <SuperAdminPanel />
        </main>
      </div>
    </SuperAdminRoute>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { authService } from "@/services/AuthService";

export function DashboardNav() {
  const router = useRouter();
  const { profile } = useAuth();

  async function handleLogout() {
    await authService.logout();
    router.push("/login");
  }

  return (
    <header className="flex items-center justify-between border-b border-border px-4 py-3">
      <Link href="/dashboard" className="font-semibold tracking-tight">
        ManuShop
      </Link>
      <nav className="flex items-center gap-4 text-sm">
        {profile?.role === "admin" && (
          <>
            <Link
              href="/dashboard/shop"
              className="text-muted-foreground hover:text-foreground"
            >
              Boutique
            </Link>
            <Link
              href="/dashboard/team"
              className="text-muted-foreground hover:text-foreground"
            >
              Équipe
            </Link>
          </>
        )}
        {profile && (
          <span className="text-muted-foreground">{profile.displayName}</span>
        )}
        <Button variant="outline" size="sm" onClick={handleLogout}>
          Déconnexion
        </Button>
      </nav>
    </header>
  );
}

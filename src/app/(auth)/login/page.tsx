import { Lock } from "lucide-react";
import type { Metadata } from "next";

import { Badge } from "@/components/ui/Badge";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Connexion — ManuShop",
};

export default function LoginPage() {
  return (
    // LiquidGlassCard wraps its children in its own inner div (for the
    // pointer-reactive blob layer), so grid classes on the card itself
    // never reach these two panels — the grid lives one level in instead.
    <LiquidGlassCard className="w-full max-w-4xl p-0">
      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="hidden flex-col justify-between gap-10 border-r border-white/10 p-8 md:flex">
          <div className="flex flex-col gap-5">
            <Badge className="w-fit">Espace commerçant</Badge>
            <h1 className="text-3xl leading-tight font-semibold text-white">
              Votre boutique vous attend.
            </h1>
            <p className="text-sm text-white/70">
              Retrouvez vos produits, vos commandes et vos clients dans un
              espace simple, pensé pour votre quotidien.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/50">
            <Lock className="size-3.5" />
            Connexion sécurisée et confidentielle
          </div>
        </div>

        <div className="flex flex-col gap-6 p-8">
          <div>
            <h2 className="text-2xl font-semibold text-white">
              Se connecter
            </h2>
            <p className="text-sm text-white/70">
              Accédez à votre espace en quelques secondes.
            </p>
          </div>
          <LoginForm />
        </div>
      </div>
    </LiquidGlassCard>
  );
}

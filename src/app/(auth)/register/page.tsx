import { Lock } from "lucide-react";
import type { Metadata } from "next";

import { Badge } from "@/components/ui/Badge";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Créer ma boutique — ManuShop",
};

export default function RegisterPage() {
  return (
    // Voir /login : les classes grid vont sur un <div> enfant, pas sur
    // LiquidGlassCard lui-même (il enveloppe déjà ses enfants dans son
    // propre <div> pour la couche du blob qui suit le curseur).
    <LiquidGlassCard className="w-full max-w-4xl p-0">
      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="hidden flex-col justify-between gap-10 border-r border-white/10 p-8 md:flex">
          <div className="flex flex-col gap-5">
            <Badge className="w-fit">Nouvelle boutique</Badge>
            <h1 className="text-3xl leading-tight font-semibold text-white">
              Lancez votre boutique en quelques minutes.
            </h1>
            <p className="text-sm text-white/70">
              Catalogue, stock, facturation et publication sociale : tout ce
              qu&apos;il faut pour digitaliser votre commerce, réuni au même
              endroit.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/50">
            <Lock className="size-3.5" />
            Vos informations restent confidentielles
          </div>
        </div>

        <div className="flex flex-col gap-6 p-8">
          <div>
            <h2 className="text-2xl font-semibold text-white">
              Créer votre boutique
            </h2>
            <p className="text-sm text-white/70">
              Quelques informations et votre espace commerçant est prêt.
            </p>
          </div>
          <RegisterForm />
        </div>
      </div>
    </LiquidGlassCard>
  );
}

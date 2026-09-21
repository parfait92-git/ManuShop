import type { Metadata } from "next";

import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Mot de passe oublié — ManuShop",
};

export default function ForgotPasswordPage() {
  return (
    <LiquidGlassCard className="flex w-full max-w-sm flex-col items-center gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-white">
          Mot de passe oublié
        </h1>
        <p className="mt-1 text-sm text-white/70">
          Indiquez votre email pour recevoir un lien de réinitialisation.
        </p>
      </div>
      <ForgotPasswordForm />
    </LiquidGlassCard>
  );
}

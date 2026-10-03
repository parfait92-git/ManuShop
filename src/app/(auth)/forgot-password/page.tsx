import type { Metadata } from "next";

import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import { GuestRoute } from "@/components/auth/GuestRoute";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { PageTour } from "@/components/onboarding/PageTour";

export const metadata: Metadata = {
  title: "Mot de passe oublié",
  robots: { index: false, follow: true },
};

export default function ForgotPasswordPage() {
  return (
    <>
      <PageTour tourId="auth-forgot-password" />
      <GuestRoute>
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
      </GuestRoute>
    </>
  );
}

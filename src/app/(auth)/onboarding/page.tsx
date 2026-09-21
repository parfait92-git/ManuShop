"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/components/providers/AuthProvider";
import { OnboardingForm } from "@/components/auth/OnboardingForm";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";

export default function OnboardingPage() {
  const { firebaseUser, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!firebaseUser) {
      router.replace("/login");
      return;
    }
    // Un profil existe déjà : rien à faire ici.
    if (profile) {
      router.replace("/dashboard");
    }
  }, [loading, firebaseUser, profile, router]);

  if (loading || !firebaseUser || profile) {
    return null;
  }

  return (
    <LiquidGlassCard className="flex w-full max-w-sm flex-col items-center gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-white">
          Plus qu&apos;une étape
        </h1>
        <p className="mt-1 text-sm text-white/70">
          Donnez un nom à votre boutique pour terminer la création de votre
          compte.
        </p>
      </div>
      <OnboardingForm />
    </LiquidGlassCard>
  );
}

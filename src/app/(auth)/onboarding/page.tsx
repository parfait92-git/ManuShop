"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/components/providers/AuthProvider";
import { OnboardingForm } from "@/components/auth/OnboardingForm";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import { authService } from "@/services/AuthService";

export default function OnboardingPage() {
  const { firebaseUser, profile, loading } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await authService.logout();
    router.push("/login");
  }

  useEffect(() => {
    if (loading) return;
    if (!firebaseUser) {
      router.replace("/login");
      return;
    }
    // Un profil existe déjà : rien à faire ici, sinon rediriger vers le bon
    // espace — le dashboard pour un admin/vendeur qui a déjà une boutique,
    // le catalogue pour un client (Module 12 : plus de boutique créée à
    // l'inscription).
    if (profile) {
      router.replace(profile.shopId ? "/dashboard" : "/catalogue");
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
          Donnez-nous votre nom pour terminer la création de votre compte.
        </p>
      </div>
      <OnboardingForm />
      <button
        type="button"
        onClick={handleLogout}
        className="text-sm text-white/60 underline-offset-4 hover:text-white hover:underline"
      >
        Se déconnecter
      </button>
    </LiquidGlassCard>
  );
}

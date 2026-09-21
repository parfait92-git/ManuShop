"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/components/providers/AuthProvider";
import { OnboardingForm } from "@/components/auth/OnboardingForm";

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
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 px-4 py-12">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Plus qu&apos;une étape
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Donnez un nom à votre boutique pour terminer la création de votre
          compte.
        </p>
      </div>
      <OnboardingForm />
    </div>
  );
}

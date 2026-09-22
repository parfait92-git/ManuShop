"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  CompleteMerchantSignupSchema,
  type CompleteMerchantSignupInput,
} from "@/lib/validation/auth";
import { authService } from "@/services/AuthService";

export function OnboardingForm() {
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CompleteMerchantSignupInput>({
    resolver: zodResolver(CompleteMerchantSignupSchema),
  });

  async function onSubmit(data: CompleteMerchantSignupInput) {
    setFormError(null);
    try {
      await authService.completeMerchantSignup(data);
      // Le profil vient d'être créé dans Firestore : sans ce rafraîchissement,
      // le contexte d'auth garde `profile === null` et ProtectedRoute
      // renverrait aussitôt vers /onboarding (boucle). Ce compte est un
      // client (Module 12) : direction le catalogue, pas le dashboard.
      await refreshProfile();
      router.push("/catalogue");
    } catch {
      setFormError("Une erreur est survenue. Veuillez réessayer.");
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex w-full max-w-sm flex-col gap-4"
      noValidate
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="displayName">Votre nom</Label>
        <Input
          id="displayName"
          autoComplete="name"
          aria-invalid={!!errors.displayName}
          {...register("displayName")}
        />
        {errors.displayName && (
          <p className="text-sm text-destructive">
            {errors.displayName.message}
          </p>
        )}
      </div>

      {formError && <p className="text-sm text-destructive">{formError}</p>}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Enregistrement..." : "Continuer"}
      </Button>
    </form>
  );
}

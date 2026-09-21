"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CompleteMerchantSignupSchema,
  type CompleteMerchantSignupInput,
} from "@/lib/validation/auth";
import { authService } from "@/services/AuthService";

export function OnboardingForm() {
  const router = useRouter();
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
      router.push("/dashboard");
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

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="shopName">Nom de la boutique</Label>
        <Input
          id="shopName"
          autoComplete="organization"
          aria-invalid={!!errors.shopName}
          {...register("shopName")}
        />
        {errors.shopName && (
          <p className="text-sm text-destructive">{errors.shopName.message}</p>
        )}
      </div>

      {formError && <p className="text-sm text-destructive">{formError}</p>}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Création..." : "Créer ma boutique"}
      </Button>
    </form>
  );
}

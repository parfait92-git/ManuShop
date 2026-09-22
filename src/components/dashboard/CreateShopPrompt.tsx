"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Store } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreateShopSchema, type CreateShopInput } from "@/lib/validation/auth";
import { authService } from "@/services/AuthService";

/**
 * Affiché à la place du dashboard quand un compte admin/vendeur n'a pas
 * encore de `shopId` (Module 12 : l'inscription ne crée plus de boutique
 * automatiquement — un admin obtenu par attribution manuelle ou abonnement
 * doit créer la sienne explicitement ici).
 */
export function CreateShopPrompt() {
  const { refreshProfile } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateShopInput>({
    resolver: zodResolver(CreateShopSchema),
  });

  async function onSubmit(data: CreateShopInput) {
    setFormError(null);
    try {
      await authService.createShop(data.shopName);
      // Le profil vient d'être relié à la boutique créée : sans ce
      // rafraîchissement, DashboardLayout continuerait de voir
      // `profile.shopId` absent et réafficherait ce même formulaire.
      await refreshProfile();
    } catch {
      setFormError("Une erreur est survenue. Veuillez réessayer.");
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-slate-50 px-4">
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-cyan-50 text-cyan-600">
            <Store className="size-6" />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-slate-950">
              Créez votre boutique
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Il vous manque une boutique pour accéder à votre tableau de
              bord.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="shopName">Nom de la boutique</Label>
            <Input
              id="shopName"
              autoComplete="organization"
              aria-invalid={!!errors.shopName}
              {...register("shopName")}
            />
            {errors.shopName && (
              <p className="text-sm text-destructive">
                {errors.shopName.message}
              </p>
            )}
          </div>

          {formError && <p className="text-sm text-destructive">{formError}</p>}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Création..." : "Créer ma boutique"}
          </Button>
        </form>
      </div>
    </div>
  );
}

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FirebaseError } from "firebase/app";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/providers/AuthProvider";
import { useRedirectParam } from "@/hooks/useRedirectParam";
import { buildAuthHref } from "@/lib/redirectParam";
import { RegisterSchema, type RegisterInput } from "@/lib/validation/auth";
import { authService } from "@/services/AuthService";

function authErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/email-already-in-use":
        return "Un compte existe déjà avec cet email.";
      case "auth/weak-password":
        return "Le mot de passe est trop faible.";
      default:
        return "Une erreur est survenue. Veuillez réessayer.";
    }
  }
  return "Une erreur est survenue. Veuillez réessayer.";
}

export function RegisterForm() {
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const { redirectTarget } = useRedirectParam();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(RegisterSchema),
  });

  async function onSubmit(data: RegisterInput) {
    setFormError(null);
    try {
      await authService.registerShopOwner(data);
      // Arrivé depuis le panier (BF-143, demande explicite de l'utilisateur,
      // 2026-09-29) : `createUserWithEmailAndPassword` connecte déjà le
      // compte côté client (voir `inviteSeller`, même fichier, qui contourne
      // ce comportement pour NE PAS déconnecter l'admin courant) — ici on le
      // fait exprès, pour forcer une connexion explicite qui applique le
      // `?redirect=` mémorisé et ramène l'acheteur sur sa commande.
      if (redirectTarget) {
        toast.success("Compte créé avec succès !");
        await authService.logout();
        router.push(
          buildAuthHref("/login", redirectTarget, { registered: "1" })
        );
        return;
      }
      // Voir OnboardingForm : sans ce rafraîchissement, le contexte d'auth
      // garde `profile === null` et ProtectedRoute renverrait vers
      // /onboarding en boucle. L'inscription crée un compte client (Module
      // 12) : direction le catalogue, pas le dashboard (réservé aux admins).
      await refreshProfile();
      router.push("/catalogue");
    } catch (error) {
      setFormError(authErrorMessage(error));
    }
  }

  return (
    <form
      data-tour="register-form"
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
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={!!errors.email}
          {...register("email")}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Mot de passe</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            className="pr-9"
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={
              showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"
            }
            className="absolute inset-y-0 right-2 flex items-center text-muted-foreground"
          >
            {showPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        </div>
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            autoComplete="new-password"
            aria-invalid={!!errors.confirmPassword}
            className="pr-9"
            {...register("confirmPassword")}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((value) => !value)}
            aria-label={
              showConfirmPassword
                ? "Masquer la confirmation du mot de passe"
                : "Afficher la confirmation du mot de passe"
            }
            className="absolute inset-y-0 right-2 flex items-center text-muted-foreground"
          >
            {showConfirmPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="text-sm text-destructive">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      {formError && <p className="text-sm text-destructive">{formError}</p>}

      <Button data-tour="register-submit" type="submit" disabled={isSubmitting} className="mt-2 w-full">
        {isSubmitting ? "Création du compte..." : "Créer mon compte"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Déjà un compte ?{" "}
        <Link
          data-tour="register-login"
          href={buildAuthHref("/login", redirectTarget)}
          className="text-primary underline-offset-4 hover:underline"
        >
          Se connecter
        </Link>
      </p>
    </form>
  );
}

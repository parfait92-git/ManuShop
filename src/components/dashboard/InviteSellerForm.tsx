"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FirebaseError } from "firebase/app";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InviteSellerSchema, type InviteSellerInput } from "@/lib/validation/auth";
import type { User } from "@/models/user/User";
import { authService } from "@/services/AuthService";

function inviteErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/email-already-in-use":
        return "Un compte existe déjà avec cet email.";
      default:
        return "Une erreur est survenue. Veuillez réessayer.";
    }
  }
  return "Une erreur est survenue. Veuillez réessayer.";
}

export function InviteSellerForm({
  shopId,
  onInvited,
}: {
  shopId: string;
  onInvited: (seller: User) => void;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteSellerInput>({
    resolver: zodResolver(InviteSellerSchema),
  });

  async function onSubmit(data: InviteSellerInput) {
    setFormError(null);
    setInvitedEmail(null);
    try {
      const seller = await authService.inviteSeller({ ...data, shopId });
      onInvited(seller);
      setInvitedEmail(data.email);
      reset();
    } catch (error) {
      setFormError(inviteErrorMessage(error));
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex w-full max-w-sm flex-col gap-4"
      noValidate
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="displayName">Nom du vendeur</Label>
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

      {formError && <p className="text-sm text-destructive">{formError}</p>}

      {invitedEmail && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          Compte créé : un email pour définir le mot de passe a été envoyé à{" "}
          {invitedEmail}.
        </p>
      )}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Invitation en cours..." : "Inviter un vendeur"}
      </Button>
    </form>
  );
}

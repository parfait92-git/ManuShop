"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlus, KeyRound, Save, User as UserIcon } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { Area } from "react-easy-crop";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/AuthProvider";
import { ImageCropDialog } from "@/components/dashboard/ImageCropDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { Switch } from "@/components/ui/switch";
import {
  AccountSettingsSchema,
  type AccountSettingsInput,
} from "@/lib/validation/auth";
import { AVATAR_IMAGE_SIZE, cropImageToSquare } from "@/lib/imageCrop";
import { uploadAvatar } from "@/lib/upload";
import type { User } from "@/models/user/User";
import { authService } from "@/services/AuthService";

const ROLE_LABELS: Record<User["role"], string> = {
  admin: "Gérant(e) de boutique",
  seller: "Vendeur",
  client: "Client",
};

/** Paramètres personnels (profil + compte), distincts des paramètres de
 * boutique (`ShopSettingsForm`) — accessibles à tout utilisateur connecté,
 * quel que soit son rôle. */
export function AccountSettingsForm() {
  const { firebaseUser, profile, refreshProfile } = useAuth();
  const [saved, setSaved] = useState(false);
  const [pendingImageSrc, setPendingImageSrc] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [resettingPassword, setResettingPassword] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AccountSettingsInput>({
    resolver: zodResolver(AccountSettingsSchema),
    values: profile
      ? {
          displayName: profile.displayName,
          phone: profile.phone ?? "",
          photoURL: profile.photoURL ?? "",
          notifyByEmail: profile.notifyByEmail ?? true,
        }
      : undefined,
  });

  const phone = useWatch({ control, name: "phone" });
  const photoURL = useWatch({ control, name: "photoURL" });
  const notifyByEmail = useWatch({ control, name: "notifyByEmail" });

  if (!profile || !firebaseUser) {
    return <p className="text-sm text-muted-foreground">Chargement...</p>;
  }

  const hasPasswordProvider = firebaseUser.providerData.some(
    (provider) => provider.providerId === "password"
  );
  const identityContact = profile.email ?? profile.phone ?? "—";

  async function onSubmit(data: AccountSettingsInput) {
    setSaved(false);
    await authService.updateProfile(profile!.id, data);
    await refreshProfile();
    setSaved(true);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarError(null);
    setPendingImageSrc(URL.createObjectURL(file));
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleCropConfirm(crop: Area) {
    if (!pendingImageSrc) return;
    setUploadingAvatar(true);
    setAvatarError(null);
    try {
      const blob = await cropImageToSquare(
        pendingImageSrc,
        crop,
        AVATAR_IMAGE_SIZE
      );
      const url = await uploadAvatar(blob);
      setValue("photoURL", url, { shouldDirty: true });
    } catch {
      setAvatarError("Échec de l'envoi de la photo. Réessayez.");
    } finally {
      setUploadingAvatar(false);
      if (pendingImageSrc) URL.revokeObjectURL(pendingImageSrc);
      setPendingImageSrc(null);
    }
  }

  function handleCropCancel() {
    if (pendingImageSrc) URL.revokeObjectURL(pendingImageSrc);
    setPendingImageSrc(null);
  }

  async function handlePasswordReset() {
    if (!profile!.email) return;
    setResettingPassword(true);
    try {
      await authService.sendPasswordReset(profile!.email);
      toast.success("Email de réinitialisation envoyé.");
    } catch {
      toast.error("Échec de l'envoi. Réessayez.");
    } finally {
      setResettingPassword(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Paramètres du compte
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gérez votre profil personnel et vos préférences.
        </p>
      </div>

      <section className="flex flex-col gap-4 rounded-xl border border-border bg-background p-4 sm:p-6">
        <div>
          <h2 className="text-lg font-semibold">Identité</h2>
          <p className="text-sm text-muted-foreground">
            Utilisée pour vous identifier sur ManuShop.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative size-16 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
            {photoURL ? (
              <Image src={photoURL} alt="" fill sizes="64px" className="object-cover" />
            ) : (
              <span className="flex size-full items-center justify-center text-muted-foreground">
                <UserIcon className="size-6" />
              </span>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              disabled={uploadingAvatar}
              className="hidden"
              id="avatar-file"
            />
            <label
              htmlFor="avatar-file"
              className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-primary"
            >
              <ImagePlus className="size-4" />
              {uploadingAvatar ? "Envoi en cours..." : "Changer la photo"}
            </label>
            {avatarError && (
              <p className="text-sm text-destructive">{avatarError}</p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="displayName">Nom</Label>
            <Input
              id="displayName"
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
            <Label htmlFor="phone">Téléphone</Label>
            <PhoneInput
              id="phone"
              value={phone ?? ""}
              onChange={(value) =>
                setValue("phone", value, { shouldValidate: true })
              }
              aria-invalid={!!errors.phone}
            />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone.message}</p>
            )}
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Notifications par email</p>
              <p className="text-sm text-muted-foreground">
                Préférence enregistrée dès maintenant ; elle sera utilisée dès
                que l&apos;envoi d&apos;emails (nouveautés de la plateforme,
                etc.) sera disponible.
              </p>
            </div>
            <Switch
              checked={notifyByEmail}
              onCheckedChange={(checked) => setValue("notifyByEmail", checked)}
              aria-label="Notifications par email"
            />
          </div>

          <Button type="submit" disabled={isSubmitting} className="gap-1.5">
            <Save className="size-4" />
            {isSubmitting ? "Enregistrement..." : "Enregistrer"}
          </Button>
          {saved && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              Profil mis à jour.
            </p>
          )}
        </form>
      </section>

      <section className="flex flex-col gap-4 rounded-xl border border-border bg-background p-4 sm:p-6">
        <div>
          <h2 className="text-lg font-semibold">Compte</h2>
          <p className="text-sm text-muted-foreground">
            Informations liées à votre connexion, non modifiables ici.
          </p>
        </div>

        <div className="flex flex-col gap-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Identifiant de connexion</span>
            <span className="font-medium">{identityContact}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Rôle</span>
            <span className="font-medium">{ROLE_LABELS[profile.role]}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Membre depuis</span>
            <span className="font-medium">
              {profile.createdAt.toDate().toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
        </div>

        {hasPasswordProvider && profile.email && (
          <Button
            type="button"
            variant="outline"
            disabled={resettingPassword}
            onClick={handlePasswordReset}
            className="gap-1.5"
          >
            <KeyRound className="size-4" />
            {resettingPassword
              ? "Envoi en cours..."
              : "Changer le mot de passe"}
          </Button>
        )}
      </section>

      <ImageCropDialog
        key={pendingImageSrc}
        imageSrc={pendingImageSrc}
        onCancel={handleCropCancel}
        onConfirm={handleCropConfirm}
      />
    </div>
  );
}

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShopProfileSchema, type ShopProfileInput } from "@/lib/validation/auth";
import type { Shop } from "@/models/shop/Shop";
import { shopService } from "@/services/ShopService";

export function ShopProfileForm({ shopId }: { shopId: string }) {
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ShopProfileInput>({
    resolver: zodResolver(ShopProfileSchema),
  });

  useEffect(() => {
    let active = true;
    shopService.getShop(shopId).then((data) => {
      if (!active) return;
      setShop(data);
      setLoading(false);
      if (data) {
        reset({
          name: data.name,
          logo: data.logo,
          address: data.address,
          phone: data.phone,
          whatsapp: data.whatsapp,
        });
      }
    });
    return () => {
      active = false;
    };
  }, [shopId, reset]);

  async function onSubmit(data: ShopProfileInput) {
    setSaved(false);
    await shopService.updateProfile(shopId, data);
    setSaved(true);
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Chargement...</p>;
  }

  if (!shop) {
    return (
      <p className="text-sm text-destructive">
        Impossible de charger le profil de la boutique.
      </p>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex w-full max-w-md flex-col gap-4"
      noValidate
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Nom de la boutique</Label>
        <Input id="name" aria-invalid={!!errors.name} {...register("name")} />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="logo">URL du logo</Label>
        <Input id="logo" aria-invalid={!!errors.logo} {...register("logo")} />
        {errors.logo && (
          <p className="text-sm text-destructive">{errors.logo.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="address">Adresse</Label>
        <Input
          id="address"
          aria-invalid={!!errors.address}
          {...register("address")}
        />
        {errors.address && (
          <p className="text-sm text-destructive">{errors.address.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone">Téléphone</Label>
        <Input id="phone" aria-invalid={!!errors.phone} {...register("phone")} />
        {errors.phone && (
          <p className="text-sm text-destructive">{errors.phone.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="whatsapp">WhatsApp</Label>
        <Input
          id="whatsapp"
          aria-invalid={!!errors.whatsapp}
          {...register("whatsapp")}
        />
        {errors.whatsapp && (
          <p className="text-sm text-destructive">{errors.whatsapp.message}</p>
        )}
      </div>

      {saved && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          Profil de la boutique mis à jour.
        </p>
      )}

      <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
        {isSubmitting ? "Enregistrement..." : "Enregistrer"}
      </Button>
    </form>
  );
}

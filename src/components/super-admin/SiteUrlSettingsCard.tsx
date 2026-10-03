"use client";

import { Globe } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { configurationService } from "@/services/ConfigurationService";

/**
 * Domaine de la plateforme (Super Admin → Réglages, 2026-10-03). Tant que
 * rien n'est réglé, le site utilise l'adresse du déploiement Vercel. Une
 * fois un domaine acheté et ajouté dans Vercel, il s'enregistre ici : il
 * sert alors aux QR codes des factures, au plan du site et aux liens de
 * partage. Le serveur vérifie qu'il mène bien à ManuShop avant de
 * l'accepter.
 */
export function SiteUrlSettingsCard() {
  const [settings, setSettings] = useState<{ configured: string | null; fallback: string } | null>(
    null
  );
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    configurationService
      .getSiteUrlSettings()
      .then((loaded) => {
        if (!active) return;
        setSettings(loaded);
        setValue(loaded.configured ?? "");
      })
      .catch(() => active && setLoadError(true));
    return () => {
      active = false;
    };
  }, []);

  async function save(url: string) {
    setSaving(true);
    try {
      const saved = await configurationService.setSiteUrl(url);
      setSettings((current) => (current ? { ...current, configured: saved } : current));
      setValue(saved ?? "");
      toast.success(
        saved ? `Domaine enregistré : ${saved}` : "Retour à l'adresse du déploiement."
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Échec de l'enregistrement. Réessayez.");
    } finally {
      setSaving(false);
    }
  }

  if (loadError) {
    return <p className="text-sm text-destructive">Impossible de charger le domaine du site.</p>;
  }
  if (!settings) {
    return <p className="text-sm text-muted-foreground">Chargement...</p>;
  }

  const effective = settings.configured ?? settings.fallback;

  return (
    <form
      data-tour="settings-site-url"
      onSubmit={(event) => {
        event.preventDefault();
        void save(value);
      }}
      noValidate
      className="flex flex-col gap-4 rounded-xl border border-border bg-background p-4 sm:p-6"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Globe className="size-4.5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">Domaine du site</h2>
          <p className="text-sm text-muted-foreground">
            Adresse utilisée par les QR codes des factures, le plan du site et les liens de partage.
          </p>
        </div>
      </div>

      <p role="status" className="text-sm break-words">
        En vigueur : <span className="font-medium">{effective}</span>
        {!settings.configured && (
          <span className="text-muted-foreground"> (adresse du déploiement)</span>
        )}
      </p>

      <div className="flex flex-col gap-1.5">
        <Label
          htmlFor="site-url"
          help="Après l'achat d'un domaine : ajoutez-le d'abord dans Vercel (Settings → Domains) et attendez qu'il réponde, puis saisissez-le ici. Le serveur vérifie qu'il mène bien à ManuShop avant de l'enregistrer. Les factures déjà imprimées gardent leur ancienne adresse, qui reste valable tant que l'adresse Vercel fonctionne."
        >
          Nouveau domaine
        </Label>
        <Input
          id="site-url"
          type="url"
          inputMode="url"
          placeholder="https://www.manushop.cm"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={saving || !value.trim()}>
          {saving ? "Vérification..." : "Vérifier et enregistrer"}
        </Button>
        {settings.configured && (
          <Button type="button" variant="outline" disabled={saving} onClick={() => void save("")}>
            Revenir à l&apos;adresse du déploiement
          </Button>
        )}
      </div>
    </form>
  );
}

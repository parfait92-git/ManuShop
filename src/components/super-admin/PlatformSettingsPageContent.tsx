"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { configurationService } from "@/services/ConfigurationService";

/**
 * BF-122 : jusqu'ici, désactiver `/demo-catalogue` demandait de modifier
 * `configuration/general` à la main depuis la console Firebase — ce
 * réglage devient un interrupteur Super Admin ordinaire.
 */
export function PlatformSettingsPageContent() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    configurationService
      .isDemoCatalogueEnabled()
      .then((value) => {
        if (active) setEnabled(value);
      })
      .catch((err) => {
        console.error(
          "PlatformSettingsPageContent : échec du chargement des réglages",
          err
        );
        if (active) {
          setEnabled(true);
          setError("Échec du chargement des réglages. Réessayez.");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleToggle(next: boolean) {
    const previous = enabled;
    setEnabled(next);
    setSaving(true);
    try {
      await configurationService.setDemoCatalogueEnabled(next);
    } catch {
      setEnabled(previous);
      toast.error("Échec de la mise à jour du réglage. Réessayez.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Réglages</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Réglages globaux de la plateforme.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {enabled === null ? (
        <p className="text-sm text-muted-foreground">Chargement...</p>
      ) : (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background p-4 sm:p-6">
          <div className="flex flex-col gap-1">
            <Label htmlFor="demo-catalogue-toggle">
              Afficher le catalogue de démonstration
            </Label>
            <p className="text-sm text-muted-foreground">
              Tant qu&apos;aucune boutique publiée n&apos;a de produit réel
              visible, <code>/catalogue</code> se replie automatiquement sur
              une démo. Désactivez ce réglage pour ne plus jamais l&apos;afficher,
              quel que soit l&apos;état réel de la plateforme.
            </p>
          </div>
          <Switch
            id="demo-catalogue-toggle"
            checked={enabled}
            disabled={saving}
            onCheckedChange={handleToggle}
            aria-label={
              enabled
                ? "Désactiver le catalogue de démonstration"
                : "Activer le catalogue de démonstration"
            }
          />
        </div>
      )}
    </div>
  );
}

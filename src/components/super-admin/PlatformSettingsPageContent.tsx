"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { LaunchPromoSettingsCard } from "@/components/super-admin/LaunchPromoSettingsCard";
import { SiteUrlSettingsCard } from "@/components/super-admin/SiteUrlSettingsCard";
import { useI18n } from "@/i18n/I18nProvider";
import { EUR_TO_XAF } from "@/lib/currency";
import { configurationService } from "@/services/ConfigurationService";

/** Mêmes bornes que `setUsdToXafRateAction`, vérifiées ici pour un
 * message immédiat et clair. */
const MIN_USD_RATE = 50;
const MAX_USD_RATE = 5000;

/**
 * Taux du dollar en FCFA (devises des boutiques, 2026-10-02) — l'euro n'en
 * a pas besoin (parité fixe), il est seulement rappelé.
 */
function ExchangeRatesCard() {
  const { t, intlLocale } = useI18n();
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    configurationService
      .getUsdToXafRate()
      .then((rate) => {
        if (active && rate) setValue(String(rate));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const rate = Number(value.replace(",", "."));
    if (!Number.isFinite(rate) || rate < MIN_USD_RATE || rate > MAX_USD_RATE) {
      setError(t("platformRates.invalid"));
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await configurationService.setUsdToXafRate(rate);
      toast.success(t("platformRates.saved"));
    } catch {
      setError(t("platformRates.error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      data-tour="settings-rates"
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-4 rounded-xl border border-border bg-background p-4 sm:p-6"
    >
      <div>
        <h2 className="text-lg font-semibold">{t("platformRates.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("platformRates.description")}</p>
      </div>
      <p className="text-sm">
        {t("platformRates.eurFixed", { rate: EUR_TO_XAF.toLocaleString(intlLocale) })}
      </p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="usd-rate" help={t("platformRates.usdHelp")}>
          {t("platformRates.usdLabel")}
        </Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="usd-rate"
            inputMode="decimal"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Ex. 600"
            aria-invalid={!!error}
            className="sm:max-w-40"
          />
          <Button type="submit" disabled={saving} className="w-fit">
            {t("platformRates.save")}
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </form>
  );
}

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
        <div data-tour="settings-card" className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background p-4 sm:p-6">
          <div className="flex flex-col gap-1">
            <Label htmlFor="demo-catalogue-toggle" help="Tant qu'aucune boutique publiée n'a de produit visible, le Marché affiche une démonstration. Désactivez pour ne jamais l'afficher.">
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

      <SiteUrlSettingsCard />

      <LaunchPromoSettingsCard />

      <ExchangeRatesCard />
    </div>
  );
}

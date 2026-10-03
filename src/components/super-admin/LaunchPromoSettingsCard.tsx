"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/i18n/I18nProvider";
import {
  LAUNCH_PROMO_LIMITS,
  fromShopDateTimeInput,
  isLaunchPromoVisible,
  toShopDateTimeInput,
  validateLaunchPromo,
  type LaunchPromoErrors,
  type LaunchPromoSettings,
} from "@/lib/launchPromo";
import { configurationService } from "@/services/ConfigurationService";

/**
 * Réglage de la promotion de la page d'accueil (Super Admin → Réglages,
 * 2026-10-02) : textes, date de fin et interrupteur. L'accueil est
 * régénéré dès l'enregistrement (`setLaunchPromoAction`).
 */
export function LaunchPromoSettingsCard() {
  const { t, intlLocale } = useI18n();
  const [promo, setPromo] = useState<LaunchPromoSettings | null>(null);
  /** Valeur brute du champ `datetime-local`, heure du Cameroun. */
  const [endsAtInput, setEndsAtInput] = useState("");
  const [errors, setErrors] = useState<LaunchPromoErrors>({});
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    configurationService
      .getLaunchPromo()
      .then((value) => {
        if (!active) return;
        setPromo(value);
        setEndsAtInput(toShopDateTimeInput(value.endsAt));
      })
      .catch(() => active && setLoadError(true));
    return () => {
      active = false;
    };
  }, []);

  if (loadError) {
    return <p className="text-sm text-destructive">{t("launchPromoSettings.error")}</p>;
  }
  if (!promo) {
    return <p className="text-sm text-muted-foreground">Chargement...</p>;
  }

  const current: LaunchPromoSettings = { ...promo, endsAt: fromShopDateTimeInput(endsAtInput) };
  const update = (patch: Partial<LaunchPromoSettings>) => setPromo({ ...promo, ...patch });

  const status = !promo.enabled
    ? t("launchPromoSettings.statusDisabled")
    : isLaunchPromoVisible(current)
      ? t("launchPromoSettings.statusActive", {
          date: new Date(current.endsAt).toLocaleString(intlLocale, {
            dateStyle: "long",
            timeStyle: "short",
            timeZone: "Africa/Douala",
          }),
        })
      : t("launchPromoSettings.statusEnded");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateLaunchPromo(current);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    try {
      await configurationService.setLaunchPromo(current);
      toast.success(t("launchPromoSettings.saved"));
    } catch {
      toast.error(t("launchPromoSettings.error"));
    } finally {
      setSaving(false);
    }
  }

  const fieldError = (key: keyof LaunchPromoSettings) =>
    errors[key] ? <p className="text-sm text-destructive">{errors[key]}</p> : null;

  return (
    <form
      data-tour="settings-launch-promo"
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-4 rounded-xl border border-border bg-background p-4 sm:p-6"
    >
      <div>
        <h2 className="text-lg font-semibold">{t("launchPromoSettings.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("launchPromoSettings.description")}</p>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="launch-promo-enabled" help={t("launchPromoSettings.enabledHelp")}>
            {t("launchPromoSettings.enabled")}
          </Label>
          <p role="status" className="text-sm text-muted-foreground">
            {status}
          </p>
        </div>
        {/* `aria-label` : avec Base UI, `id` (et donc le <Label>) vise une
        case cachée — sans lui, l'interrupteur visible n'aurait pas de nom
        pour un lecteur d'écran. */}
        <Switch
          id="launch-promo-enabled"
          aria-label={t("launchPromoSettings.enabled")}
          checked={promo.enabled}
          onCheckedChange={(checked) => update({ enabled: checked })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="launch-promo-eyebrow" help={t("launchPromoSettings.eyebrowHelp")}>
          {t("launchPromoSettings.eyebrow")}
        </Label>
        <Input
          id="launch-promo-eyebrow"
          value={promo.eyebrow}
          maxLength={LAUNCH_PROMO_LIMITS.eyebrow}
          onChange={(event) => update({ eyebrow: event.target.value })}
          aria-invalid={!!errors.eyebrow}
        />
        {fieldError("eyebrow")}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="launch-promo-title" help={t("launchPromoSettings.titleHelp")}>
          {t("launchPromoSettings.titleLabel")}
        </Label>
        <Input
          id="launch-promo-title"
          value={promo.title}
          maxLength={LAUNCH_PROMO_LIMITS.title}
          onChange={(event) => update({ title: event.target.value })}
          aria-invalid={!!errors.title}
        />
        {fieldError("title")}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="launch-promo-description" help={t("launchPromoSettings.descriptionHelp")}>
          {t("launchPromoSettings.descriptionLabel")}
        </Label>
        <textarea
          id="launch-promo-description"
          rows={3}
          value={promo.description}
          maxLength={LAUNCH_PROMO_LIMITS.description}
          onChange={(event) => update({ description: event.target.value })}
          aria-invalid={!!errors.description}
          className="w-full resize-none rounded-lg border border-border bg-background p-3 text-sm outline-none focus-visible:border-ring"
        />
        {fieldError("description")}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="launch-promo-ends-at" help={t("launchPromoSettings.endsAtHelp")}>
          {t("launchPromoSettings.endsAt")}
        </Label>
        <Input
          id="launch-promo-ends-at"
          type="datetime-local"
          value={endsAtInput}
          onChange={(event) => setEndsAtInput(event.target.value)}
          aria-invalid={!!errors.endsAt}
          className="sm:max-w-64"
        />
        {fieldError("endsAt")}
      </div>

      <Button type="submit" disabled={saving} className="w-fit">
        {t("launchPromoSettings.save")}
      </Button>
    </form>
  );
}

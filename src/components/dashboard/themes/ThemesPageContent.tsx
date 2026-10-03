"use client";

import { Check, Eye, Palette } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DialogTour } from "@/components/onboarding/DialogTour";
import { ThemePreviewFrame } from "@/components/dashboard/themes/ThemePreviewFrame";
import { ThemeThumbnail } from "@/components/dashboard/themes/ThemeThumbnail";
import { Button } from "@/components/ui/button";
import { CoachMark } from "@/components/ui/CoachMark";
import { Dialog, DialogDescription, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { useShopTheme } from "@/hooks/useShopTheme";
import { themeService } from "@/services/ThemeService";
import { THEMES, type ThemeDefinition } from "@/themes/registry";

/**
 * Page Thèmes (2026-10-03) : les thèmes disponibles, celui appliqué coché.
 * Un thème habille tout le site de la boutique (vitrine et espace de
 * gestion). « Aperçu » montre le vrai tableau de bord dans ce thème avant
 * de l'appliquer. Le choix est rangé sous la boutique
 * (`shops/{shopId}/themes/active`).
 */
export function ThemesPageContent({ shopId }: { shopId: string }) {
  const { theme: applied, loading } = useShopTheme(shopId);
  const [previewing, setPreviewing] = useState<ThemeDefinition | null>(null);
  const [applying, setApplying] = useState(false);

  async function handleApply(theme: ThemeDefinition) {
    setApplying(true);
    try {
      await themeService.applyTheme(theme.id);
      toast.success(`Thème « ${theme.name} » appliqué à votre boutique.`);
      setPreviewing(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Échec de l'application du thème. Réessayez.");
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Palette className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h1 className="flex items-center gap-1.5 text-2xl font-semibold tracking-tight">
            Thèmes
            <CoachMark label="Aide : thèmes">
              Un thème habille tout le site de votre boutique : la vitrine que voient vos clients et votre espace de gestion. Vous pouvez en changer à tout moment ; vos produits, commandes et réglages ne bougent pas.
            </CoachMark>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choisissez l&apos;apparence de votre boutique. D&apos;autres thèmes arrivent bientôt.
          </p>
        </div>
      </div>

      <ul
        data-tour="themes-list"
        role="radiogroup"
        aria-label="Thèmes disponibles"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {THEMES.map((theme) => {
          const isApplied = !loading && theme.id === applied.id;
          return (
            <li
              key={theme.id}
              role="radio"
              aria-checked={isApplied}
              aria-label={theme.name}
              className={`flex min-w-0 flex-col gap-3 rounded-2xl border bg-background p-3 ${
                isApplied ? "border-primary ring-2 ring-primary/30" : "border-border"
              }`}
            >
              <div className="relative">
                <ThemeThumbnail dashboardTheme={theme.dashboardTheme} />
                {isApplied && (
                  <span className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                    <Check className="size-3.5" aria-hidden />
                    Appliqué
                  </span>
                )}
              </div>
              <div className="flex min-w-0 flex-col gap-1 px-1">
                <h2 className="font-semibold break-words">{theme.name}</h2>
                <p className="text-sm text-muted-foreground">{theme.description}</p>
                <ul className="mt-1 flex flex-wrap gap-1.5">
                  {theme.highlights.map((highlight) => (
                    <li key={highlight} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {highlight}
                    </li>
                  ))}
                </ul>
              </div>
              <Button
                data-tour="theme-preview-button"
                type="button"
                variant={isApplied ? "outline" : "default"}
                className="mt-auto gap-1.5"
                onClick={() => setPreviewing(theme)}
              >
                <Eye className="size-4" aria-hidden />
                {isApplied ? "Voir l'aperçu" : "Aperçu et appliquer"}
              </Button>
            </li>
          );
        })}
      </ul>

      <Dialog open={!!previewing} onOpenChange={(open) => !open && setPreviewing(null)}>
        <DialogPortal className="max-h-[92vh] max-w-5xl overflow-y-auto">
          {previewing && (
            <>
              <div className="flex items-start justify-between gap-3">
                <DialogTitle>Aperçu : {previewing.name}</DialogTitle>
                <DialogTour tourId="dialog-theme-preview" />
              </div>
              <DialogDescription>
                Votre tableau de bord dans ce thème (avec vos chiffres réels sur tablette et
                ordinateur). Le thème s&apos;applique aussi à votre vitrine.
              </DialogDescription>
              <ThemePreviewFrame shopId={shopId} dashboardTheme={previewing.dashboardTheme} />
              <div className="flex flex-wrap justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setPreviewing(null)}>
                  Fermer
                </Button>
                <Button
                  data-tour="theme-apply"
                  type="button"
                  disabled={applying || previewing.id === applied.id}
                  onClick={() => handleApply(previewing)}
                >
                  {previewing.id === applied.id
                    ? "Thème actuel"
                    : applying
                      ? "Application..."
                      : "Appliquer ce thème"}
                </Button>
              </div>
            </>
          )}
        </DialogPortal>
      </Dialog>
    </div>
  );
}

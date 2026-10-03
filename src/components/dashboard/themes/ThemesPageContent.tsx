"use client";

import { Check, Crown, Eye, Palette, ShoppingCart, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { DialogTour } from "@/components/onboarding/DialogTour";
import { ThemePreviewFrame } from "@/components/dashboard/themes/ThemePreviewFrame";
import { ThemeThumbnail } from "@/components/dashboard/themes/ThemeThumbnail";
import { Button } from "@/components/ui/button";
import { CoachMark } from "@/components/ui/CoachMark";
import { Dialog, DialogDescription, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { usePremiumCatalog } from "@/hooks/usePremiumCatalog";
import { useShopTheme } from "@/hooks/useShopTheme";
import {
  formatFcfa,
  premiumAccess,
  themeItemKey,
  type PremiumAccess,
} from "@/lib/premiumCatalog";
import type { PremiumRequest } from "@/models/premium/PremiumRequest";
import { premiumService } from "@/services/PremiumService";
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
  const { theme: applied, loading, revokedTheme, premiumState } = useShopTheme(shopId);
  const [previewing, setPreviewing] = useState<ThemeDefinition | null>(null);
  const [applying, setApplying] = useState(false);
  const [buying, setBuying] = useState(false);
  const catalog = usePremiumCatalog();
  const [requests, setRequests] = useState<PremiumRequest[]>([]);

  // Demandes d'achat de la boutique, suivies en direct : une validation du
  // Super Admin débloque le thème aussitôt.
  useEffect(() => premiumService.watchShopRequests(shopId, setRequests), [shopId]);

  /** Accès de la boutique à un thème ; `undefined` tant que ce n'est pas
   * connu. */
  function accessTo(theme: ThemeDefinition): PremiumAccess | undefined {
    if (!catalog || !premiumState) return undefined;
    return premiumAccess(themeItemKey(theme.id), premiumState, catalog);
  }
  const isPremium = (theme: ThemeDefinition) => !!catalog?.items[themeItemKey(theme.id)]?.premium;
  const priceOf = (theme: ThemeDefinition) => catalog?.items[themeItemKey(theme.id)]?.priceFcfa ?? null;
  const isPending = (theme: ThemeDefinition) =>
    requests.some((r) => r.itemKey === themeItemKey(theme.id) && r.status === "pending");

  async function handleBuy(theme: ThemeDefinition) {
    setBuying(true);
    try {
      await premiumService.requestItem(themeItemKey(theme.id));
      toast.success("Demande envoyée. Le thème sera débloqué dès que votre paiement sera validé.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Échec de la demande. Réessayez.");
    } finally {
      setBuying(false);
    }
  }

  /** Statut d'accès affiché sur la carte d'un thème premium. */
  function accessLabel(theme: ThemeDefinition): string | null {
    if (!isPremium(theme)) return null;
    const access = accessTo(theme);
    if (access === "plan") return "Inclus dans votre abonnement";
    if (access === "owned") return "Acquis";
    if (isPending(theme)) return "Demande d'achat en attente de validation";
    const price = priceOf(theme);
    return price === null ? "Prix bientôt disponible" : formatFcfa(price);
  }

  /** Bouton d'achat, pour un thème premium pas encore accessible. */
  function renderBuyButton(theme: ThemeDefinition) {
    const price = priceOf(theme);
    const pending = isPending(theme);
    return (
      <Button
        type="button"
        className="gap-1.5"
        disabled={buying || pending || price === null}
        onClick={() => handleBuy(theme)}
      >
        <ShoppingCart className="size-4" aria-hidden />
        {pending
          ? "Demande envoyée"
          : price === null
            ? "Bientôt disponible"
            : `Acheter ce thème (${formatFcfa(price)})`}
      </Button>
    );
  }

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

      {revokedTheme && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Votre boutique n&apos;a plus accès au thème premium « {revokedTheme.name} » (abonnement
            terminé ou changé) : elle est revenue sur « {applied.name} ». Achetez-le pour le
            retrouver.
          </span>
        </p>
      )}

      <ul
        data-tour="themes-list"
        role="radiogroup"
        aria-label="Thèmes disponibles"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {THEMES.map((theme) => {
          const isApplied = !loading && theme.id === applied.id;
          const access = accessTo(theme);
          const locked = isPremium(theme) && access === null;
          const label = accessLabel(theme);
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
                {isPremium(theme) && (
                  <span className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-premium-badge px-2 py-0.5 text-xs font-semibold text-premium-badge-text">
                    <Crown className="size-3.5" aria-hidden />
                    Premium
                  </span>
                )}
                {isApplied && (
                  <span className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                    <Check className="size-3.5" aria-hidden />
                    Appliqué
                  </span>
                )}
              </div>
              <div className="flex min-w-0 flex-col gap-1 px-1">
                <h2 className="font-semibold break-words">{theme.name}</h2>
                {label && (
                  <p className={`text-sm font-medium ${locked ? "text-foreground" : "text-primary"}`}>
                    {label}
                  </p>
                )}
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
                {isApplied ? "Voir l'aperçu" : locked ? "Aperçu" : "Aperçu et appliquer"}
              </Button>
              {locked && renderBuyButton(theme)}
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
                {isPremium(previewing) && accessTo(previewing) === null ? (
                  renderBuyButton(previewing)
                ) : (
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
                )}
              </div>
            </>
          )}
        </DialogPortal>
      </Dialog>
    </div>
  );
}

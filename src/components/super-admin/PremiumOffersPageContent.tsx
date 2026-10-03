"use client";

import { Check, Crown, Palette, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { CoachMark } from "@/components/ui/CoachMark";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  formatFcfa,
  listPremiumItems,
  validatePremiumCatalog,
  type PremiumCatalog,
} from "@/lib/premiumCatalog";
import { SUBSCRIPTION_PLANS } from "@/lib/subscriptionPlans";
import type { PremiumRequestDto } from "@/server/actions/premiumActions";
import { premiumService } from "@/services/PremiumService";

const ITEMS = listPremiumItems();

/** Champ de prix : vide = pas encore fixé. */
function parsePrice(value: string): number | null {
  const cleaned = value.replace(/\s/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.round(n) : NaN;
}

function RequestsSection({
  requests,
  onDecide,
  busyId,
}: {
  requests: PremiumRequestDto[];
  onDecide: (id: string, approve: boolean) => void;
  busyId: string | null;
}) {
  const pending = requests.filter((r) => r.status === "pending");
  const history = requests.filter((r) => r.status !== "pending").slice(0, 10);
  const date = (iso: string) =>
    new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

  return (
    <section
      data-tour="premium-requests"
      className="flex flex-col gap-4 rounded-xl border border-border bg-background p-4 sm:p-6"
    >
      <div>
        <h2 className="flex items-center gap-1.5 text-lg font-semibold">
          Demandes d&apos;achat {pending.length > 0 && <span className="text-primary">({pending.length})</span>}
          <CoachMark label="Aide : demandes d'achat">
            Pas encore de paiement en ligne : le commerçant demande un article, vous encaissez le
            montant hors plateforme (Mobile Money, espèces…), puis vous validez. L&apos;article est
            alors acquis définitivement par sa boutique.
          </CoachMark>
        </h2>
        <p className="text-sm text-muted-foreground">
          Validez une demande seulement après avoir reçu le paiement.
        </p>
      </div>
      {pending.length === 0 ? (
        <p className="rounded-lg bg-muted/50 px-4 py-6 text-center text-sm text-muted-foreground">
          Aucune demande en attente.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {pending.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="font-medium break-words">{r.itemLabel}</p>
                <p className="text-sm text-muted-foreground break-words">
                  {r.shopName}
                  {r.requestedByName ? ` · ${r.requestedByName}` : ""} · {formatFcfa(r.priceFcfa)} ·{" "}
                  {date(r.createdAt)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busyId === r.id}
                  onClick={() => onDecide(r.id, false)}
                >
                  <X className="size-4" aria-hidden />
                  Refuser
                </Button>
                <Button type="button" size="sm" disabled={busyId === r.id} onClick={() => onDecide(r.id, true)}>
                  <Check className="size-4" aria-hidden />
                  Paiement reçu, valider
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {history.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">Demandes traitées récemment</summary>
          <ul className="mt-2 flex flex-col gap-1">
            {history.map((r) => (
              <li key={r.id} className="break-words">
                {r.status === "approved" ? "✓ Validée" : "✗ Refusée"} — {r.itemLabel}, {r.shopName} (
                {formatFcfa(r.priceFcfa)})
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

/**
 * Offres premium (Super Admin, 2026-10-03) : ce qui est premium et son
 * prix à l'unité, le prix et le contenu de chaque formule d'abonnement, et
 * les demandes d'achat des commerçants.
 */
export function PremiumOffersPageContent() {
  const [catalog, setCatalog] = useState<PremiumCatalog | null>(null);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [requests, setRequests] = useState<PremiumRequestDto[]>([]);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  const loadRequests = useCallback(() => {
    premiumService.listRequests().then(setRequests).catch(() => setRequests([]));
  }, []);

  useEffect(() => {
    let active = true;
    premiumService
      .getCatalog()
      .then((value) => {
        if (!active) return;
        setCatalog(value);
        const initial: Record<string, string> = {};
        for (const [key, item] of Object.entries(value.items)) {
          initial[key] = item.priceFcfa === null ? "" : String(item.priceFcfa);
        }
        for (const plan of SUBSCRIPTION_PLANS) initial[`plan:${plan.id}`] = String(value.plans[plan.id].priceFcfa);
        setPrices(initial);
      })
      .catch(() => active && setLoadError(true));
    premiumService
      .listRequests()
      .then((list) => active && setRequests(list))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  if (loadError) return <p className="text-sm text-destructive">Impossible de charger les offres premium.</p>;
  if (!catalog) return <p className="text-sm text-muted-foreground">Chargement...</p>;

  const setItem = (key: string, premium: boolean) =>
    setCatalog({ ...catalog, items: { ...catalog.items, [key]: { ...catalog.items[key], premium } } });
  const toggleInclude = (planId: keyof PremiumCatalog["plans"], key: string, included: boolean) => {
    const plan = catalog.plans[planId];
    setCatalog({
      ...catalog,
      plans: {
        ...catalog.plans,
        [planId]: {
          ...plan,
          includes: included ? [...plan.includes, key] : plan.includes.filter((k) => k !== key),
        },
      },
    });
  };

  async function handleSave() {
    if (!catalog) return;
    const next: PremiumCatalog = {
      items: Object.fromEntries(
        Object.entries(catalog.items).map(([key, item]) => [key, { ...item, priceFcfa: parsePrice(prices[key] ?? "") }])
      ),
      plans: Object.fromEntries(
        SUBSCRIPTION_PLANS.map((plan) => [
          plan.id,
          { ...catalog.plans[plan.id], priceFcfa: parsePrice(prices[`plan:${plan.id}`] ?? "") ?? NaN },
        ])
      ) as PremiumCatalog["plans"],
    };
    const error = validatePremiumCatalog(next);
    if (error) {
      toast.error(error);
      return;
    }
    setSaving(true);
    try {
      await premiumService.saveCatalog(next);
      setCatalog(next);
      toast.success("Offres premium enregistrées.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de l'enregistrement. Réessayez.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDecide(id: string, approve: boolean) {
    setBusyId(id);
    try {
      await premiumService.decideRequest(id, approve);
      toast.success(approve ? "Achat validé : l'article est acquis par la boutique." : "Demande refusée.");
      loadRequests();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec. Réessayez.");
    } finally {
      setBusyId(null);
    }
  }

  const premiumItems = ITEMS.filter((item) => catalog.items[item.key]?.premium);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Crown className="size-6 text-amber-500" aria-hidden />
          Offres premium
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Décidez de ce qui est premium, de son prix à l&apos;unité, et de ce que chaque formule
          d&apos;abonnement inclut.
        </p>
      </div>

      <RequestsSection requests={requests} onDecide={handleDecide} busyId={busyId} />

      <section
        data-tour="premium-items"
        className="flex flex-col gap-4 rounded-xl border border-border bg-background p-4 sm:p-6"
      >
        <div>
          <h2 className="flex items-center gap-1.5 text-lg font-semibold">
            Articles premium
            <CoachMark label="Aide : articles premium">
              Un article premium n&apos;est accessible qu&apos;aux boutiques qui l&apos;ont acheté, à
              qui vous l&apos;avez accordé, ou dont la formule l&apos;inclut. Sans prix, il ne peut pas
              être acheté. Désactiver « Premium » le rend gratuit pour toutes les boutiques.
            </CoachMark>
          </h2>
          <p className="text-sm text-muted-foreground">Prix d&apos;achat à l&apos;unité, acquis définitivement.</p>
        </div>
        <ul className="flex flex-col divide-y divide-border">
          {ITEMS.map((item) => {
            const settings = catalog.items[item.key];
            const Icon = item.kind === "theme" ? Palette : Sparkles;
            return (
              <li key={item.key} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="flex min-w-0 items-center gap-2">
                  <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="font-medium break-words">{item.label}</span>
                  {settings.premium && (
                    <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                      <Crown className="size-3" aria-hidden />
                      Premium
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Switch
                      checked={settings.premium}
                      onCheckedChange={(checked) => setItem(item.key, checked)}
                      aria-label={`${item.label} : premium`}
                    />
                    Premium
                  </label>
                  <span className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={500}
                      disabled={!settings.premium}
                      value={prices[item.key] ?? ""}
                      placeholder="Prix à fixer"
                      onChange={(e) => setPrices({ ...prices, [item.key]: e.target.value })}
                      aria-label={`Prix de ${item.label} (FCFA)`}
                      className="w-32"
                    />
                    <span className="text-sm text-muted-foreground">FCFA</span>
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section
        data-tour="premium-plans"
        className="flex flex-col gap-4 rounded-xl border border-border bg-background p-4 sm:p-6"
      >
        <div>
          <h2 className="flex items-center gap-1.5 text-lg font-semibold">
            Formules d&apos;abonnement
            <CoachMark label="Aide : formules d'abonnement">
              Le prix de chaque formule, affiché aux commerçants qui créent leur boutique, et les
              articles premium inclus : une boutique y a accès tant que son abonnement est en cours.
            </CoachMark>
          </h2>
          <p className="text-sm text-muted-foreground">Cochez les articles premium inclus dans chaque formule.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SUBSCRIPTION_PLANS.map((plan) => (
            <fieldset key={plan.id} className="flex min-w-0 flex-col gap-3 rounded-lg border border-border p-3">
              <legend className="px-1 font-semibold">{plan.label}</legend>
              <span className="flex items-center gap-1.5">
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={500}
                  value={prices[`plan:${plan.id}`] ?? ""}
                  onChange={(e) => setPrices({ ...prices, [`plan:${plan.id}`]: e.target.value })}
                  aria-label={`Prix de la formule ${plan.label} (FCFA)`}
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground">FCFA</span>
              </span>
              {premiumItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun article premium.</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {premiumItems.map((item) => (
                    <li key={item.key}>
                      <label className="flex items-start gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="mt-0.5 size-4"
                          checked={catalog.plans[plan.id].includes.includes(item.key)}
                          onChange={(e) => toggleInclude(plan.id, item.key, e.target.checked)}
                        />
                        <span className="break-words">{item.label}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </fieldset>
          ))}
        </div>
      </section>

      <Button data-tour="premium-save" type="button" className="w-fit" disabled={saving} onClick={handleSave}>
        {saving ? "Enregistrement..." : "Enregistrer les offres"}
      </Button>
    </div>
  );
}

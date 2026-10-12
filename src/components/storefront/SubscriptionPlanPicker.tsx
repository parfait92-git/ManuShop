"use client";

import { Check, Crown, Sparkles } from "lucide-react";

import {
  SUBSCRIPTION_PLANS,
  bestValuePlan,
  computeSubscriptionExpiry,
  monthlyEquivalent,
  savingsVsMonthly,
} from "@/lib/subscriptionPlans";
import type { SubscriptionPlan } from "@/models/shop/Shop";

const fcfa = (n: number) => `${n.toLocaleString("fr-FR")} FCFA`;

/**
 * Choix de la formule d'abonnement, dernière étape de « Créer ma
 * boutique » (BF-83, revu le 2026-10-12 pour être plus clair et plus
 * attractif) : une carte par formule avec sa durée, son prix, l'équivalent
 * par mois et l'économie par rapport au mensuel — calculés sur les prix
 * réglés par le Super Admin —, les avantages premium inclus, la meilleure
 * offre mise en avant et un récapitulatif du choix.
 */
export function SubscriptionPlanPicker({
  value,
  onChange,
  prices,
  includedLabels,
}: {
  value: SubscriptionPlan;
  onChange: (plan: SubscriptionPlan) => void;
  /** Prix de chaque formule (FCFA). */
  prices: Record<SubscriptionPlan, number>;
  /** Avantages premium inclus dans chaque formule. */
  includedLabels: Record<SubscriptionPlan, string[]>;
}) {
  const best = bestValuePlan(prices);
  const chosen = SUBSCRIPTION_PLANS.find((p) => p.id === value) ?? SUBSCRIPTION_PLANS[0];
  const endsOn = computeSubscriptionExpiry(chosen.id, new Date()).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-col gap-3">
      <div role="radiogroup" aria-label="Formule d'abonnement" data-tour="wizard-plans" className="flex flex-col gap-3">
        {/* De la plus longue à la plus courte : la meilleure offre, choisie
            d'office, est la première visible sur un téléphone. */}
        {[...SUBSCRIPTION_PLANS].reverse().map((plan) => {
          const selected = plan.id === value;
          const isBest = plan.id === best;
          const price = prices[plan.id];
          const perMonth = monthlyEquivalent(plan.id, price);
          const saving = savingsVsMonthly(plan.id, price, prices.monthly);
          const included = includedLabels[plan.id] ?? [];
          return (
            <button
              key={plan.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(plan.id)}
              className={`group relative flex w-full items-start gap-3 rounded-xl border-2 p-4 text-left transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none ${
                selected
                  ? "border-primary bg-primary/5 shadow-md"
                  : isBest
                    ? "border-primary/40 hover:border-primary/70 hover:bg-primary/5"
                    : "border-border hover:border-muted-foreground/40 hover:bg-muted/40"
              } ${isBest ? "mt-2" : ""}`}
            >
              {isBest && (
                <span className="absolute -top-3 left-4 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground shadow-sm">
                  <Crown className="size-3.5" aria-hidden />
                  Meilleure offre
                </span>
              )}

              {/* Indicateur de choix. */}
              <span
                aria-hidden
                className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                  selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
                }`}
              >
                {selected && <Check className="size-3 motion-safe:animate-in motion-safe:zoom-in-50" strokeWidth={3} />}
              </span>

              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className="flex items-baseline gap-2">
                    <span className="font-semibold">{plan.label}</span>
                    <span className="text-xs text-muted-foreground">{plan.duration}</span>
                  </span>
                  <span className="text-lg font-bold tabular-nums">{fcfa(price)}</span>
                </span>
                <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <span className="text-sm text-muted-foreground">{plan.description}</span>
                  {saving > 0 && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                      −{saving} %
                    </span>
                  )}
                </span>
                {plan.id !== "monthly" && (
                  <span className="text-xs text-muted-foreground">soit {fcfa(perMonth)} / mois</span>
                )}
                {included.length > 0 && (
                  <span className="mt-1 flex flex-col gap-1 border-t border-border pt-2">
                    {included.map((label) => (
                      <span key={label} className="flex items-start gap-1.5 text-xs text-foreground">
                        <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
                        {label}
                      </span>
                    ))}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <p
        aria-live="polite"
        className="rounded-lg bg-muted px-3 py-2 text-sm"
      >
        <span className="font-medium">{chosen.label}</span> · {fcfa(prices[chosen.id])} — valable jusqu&apos;au{" "}
        {endsOn}. Vous pourrez changer de formule plus tard.
      </p>
    </div>
  );
}

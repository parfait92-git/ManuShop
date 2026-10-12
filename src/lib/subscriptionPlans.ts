import type { SubscriptionPlan } from "@/models/shop/Shop";

/**
 * Offres d'abonnement proposées à la dernière étape de l'assistant "Créer ma
 * boutique" (BF-83). Partagé entre le client (affichage des cartes) et la
 * Server Action (calcul de l'expiration) — pas de `"use server"` ici.
 *
 * Prix repris tels quels du résultat du générateur de design (2026-09-25) —
 * ce sont des placeholders, pas une décision business validée. À confirmer
 * avec l'utilisateur avant un vrai lancement commercial.
 */
export interface SubscriptionPlanOption {
  id: SubscriptionPlan;
  label: string;
  priceFcfa: number;
  description: string;
  /** Durée en clair, ex. « 12 mois ». */
  duration: string;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlanOption[] = [
  {
    id: "daily",
    label: "Quotidien",
    priceFcfa: 500,
    description: "Pour essayer, sans engagement",
    duration: "1 jour",
  },
  {
    id: "weekly",
    label: "Hebdomadaire",
    priceFcfa: 2500,
    description: "Pour une vente ponctuelle ou un marché",
    duration: "7 jours",
  },
  {
    id: "monthly",
    label: "Mensuel",
    priceFcfa: 8000,
    description: "Pour vendre toute l'année, mois après mois",
    duration: "1 mois",
  },
  {
    id: "quarterly",
    label: "Trimestriel",
    priceFcfa: 20000,
    description: "Pour grandir sereinement",
    duration: "3 mois",
  },
  {
    id: "yearly",
    label: "Annuel",
    priceFcfa: 60000,
    description: "Le meilleur prix pour une boutique installée",
    duration: "12 mois",
  },
];

const PLAN_DURATION_MS: Record<SubscriptionPlan, number> = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
  quarterly: 90 * 24 * 60 * 60 * 1000,
  yearly: 365 * 24 * 60 * 60 * 1000,
};

/** "Mois"/"année" approximés en jours (30/365) plutôt qu'un calendrier
 * civil — suffisant pour une date d'expiration, pas une facturation
 * comptable au jour près. */
export function computeSubscriptionExpiry(
  plan: SubscriptionPlan,
  from: Date
): Date {
  return new Date(from.getTime() + PLAN_DURATION_MS[plan]);
}

/** Nombre de périodes de la formule dans un mois (mois civil : 12 par an). */
const PER_MONTH: Record<SubscriptionPlan, number> = {
  daily: 365 / 12,
  weekly: 52 / 12,
  monthly: 1,
  quarterly: 1 / 3,
  yearly: 1 / 12,
};

/** Prix ramené au mois, pour comparer les formules entre elles. */
export function monthlyEquivalent(plan: SubscriptionPlan, priceFcfa: number): number {
  return Math.round(priceFcfa * PER_MONTH[plan]);
}

/** Économie par rapport à la formule mensuelle, en % entier (0 si aucune). */
export function savingsVsMonthly(plan: SubscriptionPlan, priceFcfa: number, monthlyPriceFcfa: number): number {
  if (plan === "monthly" || monthlyPriceFcfa <= 0) return 0;
  const saving = 1 - monthlyEquivalent(plan, priceFcfa) / monthlyPriceFcfa;
  // Arrondi vers le bas : une économie annoncée n'est jamais exagérée.
  return saving > 0 ? Math.floor(saving * 100) : 0;
}

/** Formule la plus avantageuse : le plus bas prix ramené au mois. */
export function bestValuePlan(prices: Record<SubscriptionPlan, number>): SubscriptionPlan {
  return SUBSCRIPTION_PLANS.reduce((best, plan) =>
    monthlyEquivalent(plan.id, prices[plan.id]) < monthlyEquivalent(best.id, prices[best.id]) ? plan : best
  ).id;
}

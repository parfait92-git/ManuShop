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
  recommended?: boolean;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlanOption[] = [
  {
    id: "daily",
    label: "Quotidien",
    priceFcfa: 500,
    description: "Idéal pour tester votre boutique",
  },
  {
    id: "weekly",
    label: "Hebdomadaire",
    priceFcfa: 2500,
    description: "Pour les ventes régulières",
  },
  {
    id: "monthly",
    label: "Mensuel",
    priceFcfa: 8000,
    description: "Le meilleur équilibre",
  },
  {
    id: "quarterly",
    label: "Trimestriel",
    priceFcfa: 20000,
    description: "Pour développer sereinement",
  },
  {
    id: "yearly",
    label: "Annuel",
    priceFcfa: 60000,
    description: "Économisez 37%",
    recommended: true,
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

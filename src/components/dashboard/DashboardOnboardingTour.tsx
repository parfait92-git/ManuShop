"use client";

import type { Step } from "react-joyride";

import { useAuth } from "@/components/providers/AuthProvider";
import { GuidedTour } from "@/components/onboarding/GuidedTour";
import { authService } from "@/services/AuthService";

export const DASHBOARD_ONBOARDING_TOUR_ID = "dashboard-onboarding";

const BASE_STEPS: Step[] = [
  {
    target: "body",
    placement: "center",
    content:
      "Bienvenue sur votre tableau de bord ! Faisons un tour rapide des essentiels.",
  },
  {
    target: '[data-tour="stat-cards"]',
    content:
      "Vos chiffres du mois en un coup d'œil : ventes, produits actifs, nouveaux clients et commandes.",
  },
  {
    target: '[data-tour="nav-products"]',
    content:
      "Ajoutez et gérez vos produits ici — photos, prix, stock et publication.",
  },
  {
    target: '[data-tour="nav-orders"]',
    content: "Suivez et mettez à jour le statut de vos commandes.",
  },
];

const ADMIN_ONLY_STEP: Step = {
  target: '[data-tour="nav-shop-settings"]',
  content:
    "Personnalisez votre boutique (logo, contacts, notifications) depuis les Paramètres.",
};

const FINAL_STEP: Step = {
  target: '[data-tour="view-shop"]',
  content:
    "Ce bouton ouvre votre boutique telle que vos clients la voient. Bonne vente !",
};

/**
 * BF-134 : onboarding auto-lancé une seule fois par compte, pilote sur
 * `/dashboard` — n'est qu'une application de `GuidedTour` (BF-135) avec
 * `run` dérivé de `profile.seenTours` et persistance au premier passage.
 */
export function DashboardOnboardingTour() {
  const { profile, refreshProfile } = useAuth();

  if (!profile) return null;

  const steps = [
    ...BASE_STEPS,
    ...(profile.role === "admin" ? [ADMIN_ONLY_STEP] : []),
    FINAL_STEP,
  ];
  const run = !(profile.seenTours ?? []).includes(DASHBOARD_ONBOARDING_TOUR_ID);

  async function handleFinish() {
    if (!profile) return;
    await authService.markTourSeen(profile.id, DASHBOARD_ONBOARDING_TOUR_ID);
    await refreshProfile();
  }

  return <GuidedTour run={run} steps={steps} onFinish={handleFinish} />;
}

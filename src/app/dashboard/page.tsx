"use client";

import dynamic from "next/dynamic";

import { useAuth } from "@/components/providers/AuthProvider";
import { DashboardHomeContent } from "@/components/dashboard/DashboardHomeContent";
import { PageTour } from "@/components/onboarding/PageTour";
import { TABLET_UP, useMediaQuery } from "@/hooks/useMediaQuery";
import { useShopTheme } from "@/hooks/useShopTheme";

/** Vue graphique (tablette et ordinateur) : chargée à la demande, jamais
 * sur mobile — Recharts n'est pas téléchargé sur un téléphone. */
const DashboardOverview = dynamic(
  () => import("@/components/dashboard/overview/DashboardOverview").then((m) => m.DashboardOverview),
  {
    ssr: false,
    loading: () => <DashboardPlaceholder />,
  }
);

/** Place réservée pendant que la taille d'écran ou la vue se charge. */
function DashboardPlaceholder() {
  return (
    <div aria-busy className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">
      Chargement...
    </div>
  );
}

export default function DashboardPage() {
  const { profile } = useAuth();
  const isTabletUp = useMediaQuery(TABLET_UP);
  const { theme } = useShopTheme(profile?.shopId);

  if (!profile?.shopId || isTabletUp === undefined) {
    return <DashboardPlaceholder />;
  }

  return (
    <>
      <PageTour tourId="dashboard-onboarding" />
      {/* Tablette et ordinateur : le tableau de bord occupe toute la zone
      de contenu (2026-10-03), d'où l'annulation de la marge haute. */}
      {isTabletUp ? (
        <div className="-mt-6">
          <DashboardOverview shopId={profile.shopId} theme={theme.dashboardTheme} />
        </div>
      ) : (
        <DashboardHomeContent shopId={profile.shopId} />
      )}
    </>
  );
}

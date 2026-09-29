"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { DashboardHomeContent } from "@/components/dashboard/DashboardHomeContent";
import { DashboardOnboardingTour } from "@/components/dashboard/DashboardOnboardingTour";

export default function DashboardPage() {
  const { profile } = useAuth();

  if (!profile?.shopId) {
    return <p className="text-sm text-muted-foreground">Chargement...</p>;
  }

  return (
    <>
      <DashboardOnboardingTour />
      <DashboardHomeContent shopId={profile.shopId} />
    </>
  );
}

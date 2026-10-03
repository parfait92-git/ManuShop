"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { DashboardHomeContent } from "@/components/dashboard/DashboardHomeContent";
import { PageTour } from "@/components/onboarding/PageTour";

export default function DashboardPage() {
  const { profile } = useAuth();

  if (!profile?.shopId) {
    return <p className="text-sm text-muted-foreground">Chargement...</p>;
  }

  return (
    <>
      <PageTour tourId="dashboard-onboarding" />
      <DashboardHomeContent shopId={profile.shopId} />
    </>
  );
}

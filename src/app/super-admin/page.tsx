"use client";

import { SuperAdminPanel } from "@/components/super-admin/SuperAdminPanel";
import { PageTour } from "@/components/onboarding/PageTour";

export default function SuperAdminPage() {
  return (
    <>
      <PageTour tourId="super-admin-home" />
      <SuperAdminPanel />
    </>
  );
}

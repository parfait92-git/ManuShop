"use client";

import { PlatformSettingsPageContent } from "@/components/super-admin/PlatformSettingsPageContent";
import { PageTour } from "@/components/onboarding/PageTour";

export default function PlatformSettingsPage() {
  return (
    <>
      <PageTour tourId="super-admin-settings" />
      <PlatformSettingsPageContent />
    </>
  );
}

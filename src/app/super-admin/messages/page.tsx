"use client";

import { SupportMessagesPageContent } from "@/components/super-admin/SupportMessagesPageContent";
import { PageTour } from "@/components/onboarding/PageTour";

export default function SupportMessagesPage() {
  return (
    <>
      <PageTour tourId="super-admin-messages" />
      <SupportMessagesPageContent />
    </>
  );
}

"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { useDashboardNotificationSounds } from "@/hooks/useDashboardNotificationSounds";

/** Ne rend rien — monte juste les abonnements de sons de notification pour
 * toute la session dashboard (voir `useDashboardNotificationSounds`). */
export function DashboardNotificationSounds() {
  const { profile } = useAuth();
  useDashboardNotificationSounds(profile?.shopId);
  return null;
}

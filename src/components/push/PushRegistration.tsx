"use client";

import { useEffect } from "react";

import { useAuth } from "@/components/providers/AuthProvider";
import { pushService } from "@/services/PushService";

/**
 * Garde l'appareil inscrit aux notifications push pour le compte connecté
 * (2026-10-04) : à chaque connexion, si les notifications ont été activées
 * sur cet appareil, son jeton (qui peut changer) est réenregistré au nom du
 * compte — y compris après un changement de compte. Ne rend rien.
 */
export function PushRegistration() {
  const { firebaseUser } = useAuth();
  const uid = firebaseUser?.uid;

  useEffect(() => {
    if (!uid || !pushService.isEnabledHere()) return;
    pushService.refresh().catch(() => {});
  }, [uid]);

  return null;
}

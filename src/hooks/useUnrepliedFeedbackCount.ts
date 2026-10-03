"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { countUnreplied, feedbackService } from "@/services/FeedbackService";

const POLL_INTERVAL_MS = 120_000;

/**
 * Badge « Avis clients » du menu du commerçant : nombre d'avis sans
 * réponse. Relu à chaque changement de page (une réponse donnée sur
 * `/dashboard/avis` fait baisser le compteur) et toutes les deux minutes.
 */
export function useUnrepliedFeedbackCount(shopId: string | undefined): number {
  const pathname = usePathname();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!shopId) return;
    let active = true;
    function refresh() {
      feedbackService
        .listForShop(shopId!)
        .then((groups) => {
          if (active) setCount(groups.reduce((sum, group) => sum + countUnreplied(group), 0));
        })
        .catch(() => {});
    }
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [shopId, pathname]);

  return shopId ? count : 0;
}

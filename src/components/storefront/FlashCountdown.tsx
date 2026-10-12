"use client";

import { Zap } from "lucide-react";
import { useEffect, useState } from "react";

import { getTimeParts, pad2 } from "@/lib/countdown";

/**
 * Compte à rebours d'une promotion flash (BF-33, 2026-10-12), à la
 * seconde. Ne rend rien une fois la promotion terminée.
 */
export function FlashCountdown({ endsAt, className = "" }: { endsAt: number; className?: string }) {
  // Valeur stable au premier rendu (serveur et navigateur identiques),
  // puis l'heure réelle chaque seconde.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    queueMicrotask(() => setNow(Date.now()));
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  if (now === null) return null;
  const t = getTimeParts(endsAt, now);
  if (t.expired) return null;
  return (
    <span
      role="timer"
      aria-live="off"
      className={`inline-flex items-center gap-1.5 rounded-full bg-destructive px-3 py-1 text-xs font-semibold text-white tabular-nums ${className}`}
    >
      <Zap className="size-3.5" aria-hidden />
      Se termine dans {t.days > 0 ? `${t.days} j ` : ""}
      {pad2(t.hours)} h {pad2(t.minutes)} min {pad2(t.seconds)} s
    </span>
  );
}

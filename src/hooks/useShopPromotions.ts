"use client";

import { useEffect, useState } from "react";

import type { Promotion } from "@/models/promotion/Promotion";
import { promotionRepository } from "@/repositories/PromotionRepository";

/**
 * Campagnes d'une boutique, en direct (2026-10-12) : une seule écoute
 * Firestore par boutique, partagée par toutes les cartes et fiches qui la
 * demandent (le Marché affiche des articles de plusieurs boutiques). Les
 * prix suivent ainsi le début et la fin d'une campagne sans recharger.
 */
interface Entry {
  promotions: Promotion[];
  listeners: Set<(promotions: Promotion[]) => void>;
  stop?: () => void;
}

const entries = new Map<string, Entry>();
const EMPTY: Promotion[] = [];

function subscribe(shopId: string, listener: (promotions: Promotion[]) => void): () => void {
  let entry = entries.get(shopId);
  if (!entry) {
    const created: Entry = { promotions: EMPTY, listeners: new Set() };
    entries.set(shopId, created);
    created.stop = promotionRepository.watchByShop(
      shopId,
      (promotions) => {
        created.promotions = promotions;
        created.listeners.forEach((l) => l(promotions));
      },
      () => {}
    );
    entry = created;
  }
  entry.listeners.add(listener);
  listener(entry.promotions);
  return () => {
    entry!.listeners.delete(listener);
    if (entry!.listeners.size === 0) {
      entry!.stop?.();
      entries.delete(shopId);
    }
  };
}

export function useShopPromotions(shopId: string | undefined | null): Promotion[] {
  const [promotions, setPromotions] = useState<Promotion[]>(EMPTY);
  useEffect(() => {
    if (!shopId) return;
    return subscribe(shopId, setPromotions);
  }, [shopId]);
  return shopId ? promotions : EMPTY;
}

/** Campagnes de plusieurs boutiques (le Marché), par boutique. */
export function useShopsPromotions(shopIds: string[]): Map<string, Promotion[]> {
  const key = [...new Set(shopIds)].sort().join("|");
  const [byShop, setByShop] = useState<Map<string, Promotion[]>>(() => new Map());
  useEffect(() => {
    if (!key) return;
    const stops = key.split("|").map((shopId) =>
      subscribe(shopId, (promotions) =>
        setByShop((current) => {
          if (current.get(shopId) === promotions) return current;
          const next = new Map(current);
          next.set(shopId, promotions);
          return next;
        })
      )
    );
    return () => stops.forEach((stop) => stop());
  }, [key]);
  return byShop;
}

/**
 * Heure servant au calcul des prix (2026-10-12) : rafraîchie à chaque
 * changement des campagnes, à l'instant exact où l'une commence ou se
 * termine, et au moins chaque minute — le prix suit sans recharger la
 * page, y compris quand le gérant termine une campagne en avance.
 */
export function useNow(promotions?: readonly { startsAt: { toMillis(): number }; endsAt: { toMillis(): number } }[]): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => setNow(new Date());
    // Différé : pas de mise à jour synchrone dans l'effet.
    queueMicrotask(refresh);
    const t = Date.now();
    const next = (promotions ?? [])
      .flatMap((p) => [p.startsAt.toMillis(), p.endsAt.toMillis()])
      .filter((ms) => ms > t)
      .reduce((min, ms) => Math.min(min, ms), Infinity);
    const timeout = Number.isFinite(next) && next - t < 60_000 ? window.setTimeout(refresh, next - t + 50) : undefined;
    const id = window.setInterval(refresh, 60_000);
    return () => {
      window.clearInterval(id);
      if (timeout) window.clearTimeout(timeout);
    };
  }, [promotions]);
  return now;
}

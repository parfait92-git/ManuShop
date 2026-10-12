"use client";

import { BadgePercent, Zap } from "lucide-react";

import { FlashCountdown } from "@/components/storefront/FlashCountdown";
import { isCampaignLive } from "@/lib/pricing";
import type { Promotion } from "@/models/promotion/Promotion";

/** « −20 % sur toute la boutique », « −1 500 FCFA sur Savons »… */
export function promotionSummary(p: Pick<Promotion, "kind" | "value" | "target">): string {
  const amount = p.kind === "percent" ? `−${p.value} %` : `−${p.value.toLocaleString("fr-FR")} FCFA`;
  switch (p.target.type) {
    case "shop":
      return `${amount} sur toute la boutique`;
    case "categories":
      return `${amount} sur ${p.target.categories.join(", ")}`;
    case "products":
      return `${amount} sur ${p.target.productIds.length > 1 ? `${p.target.productIds.length} articles` : "un article"}`;
  }
}

const endDate = (p: Promotion) =>
  p.endsAt.toDate().toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

/**
 * Bandeau des promotions en cours sur la page d'une boutique (BF-33,
 * 2026-10-12) : une vente flash avec son compte à rebours, en tête ; les
 * autres campagnes avec leur date de fin.
 */
export function ShopPromotionBanner({ promotions, now }: { promotions: Promotion[]; now: Date }) {
  const live = promotions
    .filter((p) => isCampaignLive(p, now))
    .sort((a, b) => Number(b.flash) - Number(a.flash) || a.endsAt.toMillis() - b.endsAt.toMillis())
    .slice(0, 2);
  if (live.length === 0) return null;
  return (
    <section aria-label="Promotions en cours" className="flex flex-col gap-3">
      {live.map((p) =>
        p.flash ? (
          <div
            key={p.id}
            className="flex flex-col gap-2 rounded-xl bg-destructive px-5 py-4 text-white sm:flex-row sm:items-center sm:justify-between motion-safe:animate-in motion-safe:fade-in"
          >
            <div className="flex items-start gap-3">
              <Zap className="mt-0.5 size-6 shrink-0" aria-hidden />
              <div>
                <p className="text-xs font-semibold tracking-wider uppercase opacity-90">Vente flash</p>
                <p className="text-lg font-bold">{p.title}</p>
                <p className="text-sm opacity-90">{promotionSummary(p)}</p>
              </div>
            </div>
            <FlashCountdown endsAt={p.endsAt.toMillis()} className="self-start bg-white/20 text-sm sm:self-center" />
          </div>
        ) : (
          <div key={p.id} className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
            <BadgePercent className="size-5 shrink-0 text-primary" aria-hidden />
            <p className="text-sm">
              <span className="font-semibold">{p.title}</span> · {promotionSummary(p)} · jusqu&apos;au {endDate(p)}
            </p>
          </div>
        )
      )}
    </section>
  );
}

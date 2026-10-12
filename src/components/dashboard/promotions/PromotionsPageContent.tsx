"use client";

import { BadgePercent, Plus, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  PromotionDialog,
  draftFrom,
  toInput,
  type PromotionDraft,
} from "@/components/dashboard/promotions/PromotionDialog";
import { promotionSummary } from "@/components/storefront/ShopPromotionBanner";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/dateTime";
import type { Category } from "@/models/category/Category";
import type { Product } from "@/models/product/Product";
import type { Promotion } from "@/models/promotion/Promotion";
import { categoryService } from "@/services/CategoryService";
import { productService } from "@/services/ProductService";
import { promotionService } from "@/services/PromotionService";

type Status = "live" | "upcoming" | "ended";

function statusOf(p: Promotion, now: number): Status {
  if (p.endsAt.toMillis() <= now) return "ended";
  return p.startsAt.toMillis() > now ? "upcoming" : "live";
}

const GROUPS: { status: Status; title: string; empty: string }[] = [
  { status: "live", title: "En cours", empty: "Aucune promotion en cours." },
  {
    status: "upcoming",
    title: "À venir",
    empty: "Aucune promotion programmée.",
  },
  { status: "ended", title: "Terminées", empty: "Aucune promotion terminée." },
];

const BADGE: Record<Status, string> = {
  live: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  upcoming: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  ended: "bg-shell-hover text-shell-muted",
};
const BADGE_LABEL: Record<Status, string> = {
  live: "En cours",
  upcoming: "À venir",
  ended: "Terminée",
};

/**
 * Promotions de la boutique (BF-30→33, 2026-10-12), réservées au gérant :
 * campagnes en cours, à venir et terminées ; création, modification,
 * fin anticipée, suppression d'une campagne pas encore commencée.
 */
export function PromotionsPageContent({ shopId }: { shopId: string }) {
  const [promotions, setPromotions] = useState<Promotion[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [draft, setDraft] = useState<PromotionDraft | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const stop = promotionService.watchByShop(shopId, setPromotions, () =>
      setPromotions([]),
    );
    let active = true;
    Promise.all([
      categoryService.listVisible(shopId),
      productService.listActive(shopId),
    ])
      .then(([c, p]) => {
        if (!active) return;
        setCategories(c);
        setProducts(p);
      })
      .catch(() => {});
    const tick = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      active = false;
      stop();
      window.clearInterval(tick);
    };
  }, [shopId]);

  async function save(d: PromotionDraft) {
    await promotionService.save(toInput(d));
    toast.success(d.id ? "Promotion modifiée." : "Promotion créée.");
    setDraft(null);
  }

  async function act(p: Promotion, action: "end" | "remove") {
    const question =
      action === "end"
        ? `Terminer « ${p.title} » maintenant ? Les prix reviennent à la normale.`
        : `Supprimer « ${p.title} » ? Elle n'a pas encore commencé.`;
    if (!window.confirm(question)) return;
    setBusyId(p.id);
    try {
      if (action === "end") await promotionService.end(p.id);
      else await promotionService.remove(p.id);
      toast.success(
        action === "end" ? "Promotion terminée." : "Promotion supprimée.",
      );
    } catch (err) {
      toast.error(
        err instanceof Error && err.message
          ? err.message
          : "L'opération a échoué.",
      );
    } finally {
      setBusyId(null);
    }
  }

  function renderGroup(group: (typeof GROUPS)[number]) {
    const list = (promotions ?? [])
      .filter((p) => statusOf(p, now) === group.status)
      .sort((a, b) =>
        group.status === "ended"
          ? b.endsAt.toMillis() - a.endsAt.toMillis()
          : a.startsAt.toMillis() - b.startsAt.toMillis(),
      )
      .slice(0, group.status === "ended" ? 20 : undefined);
    return (
      <>
        <h2
          id={`promo-${group.status}`}
          className="text-sm font-semibold tracking-wide text-shell-subtle uppercase"
        >
          {group.title} ({list.length})
        </h2>
        {list.length === 0 ? (
          <p className="rounded-xl border border-dashed border-shell-border p-4 text-sm text-shell-subtle">
            {group.empty}
          </p>
        ) : (
          list.map((p) => {
            const status = statusOf(p, now);
            return (
              <article
                key={p.id}
                className="flex flex-col gap-3 rounded-xl border border-shell-border bg-shell-surface p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-shell-accent-soft text-shell-accent">
                    {p.flash ? (
                      <Zap className="size-5" aria-hidden />
                    ) : (
                      <BadgePercent className="size-5" aria-hidden />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-semibold text-shell-text">
                      {p.title}
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${BADGE[status]}`}
                      >
                        {BADGE_LABEL[status]}
                      </span>
                      {p.flash && (
                        <span className="rounded-full bg-destructive px-2 py-0.5 text-xs font-medium text-white">
                          Flash
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-shell-text">
                      {promotionSummary(p)}
                    </p>
                    <p className="text-xs text-shell-subtle">
                      Du {formatDateTime(p.startsAt.toDate())} au{" "}
                      {formatDateTime(p.endsAt.toDate())}
                    </p>
                  </div>
                </div>
                {status !== "ended" && (
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDraft(draftFrom(p))}
                    >
                      Modifier
                    </Button>
                    {status === "live" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busyId === p.id}
                        onClick={() => act(p, "end")}
                      >
                        Terminer
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busyId === p.id}
                        onClick={() => act(p, "remove")}
                      >
                        Supprimer
                      </Button>
                    )}
                  </div>
                )}
              </article>
            );
          })
        )}
      </>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-shell-text">
            Promotions
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-shell-subtle">
            Des réductions qui s&apos;appliquent d&apos;elles-mêmes pendant
            leurs dates, sur toute la boutique, des catégories ou des articles.
            Le client paie toujours le prix le plus bas, sans cumul.
          </p>
        </div>
        <Button
          data-tour="promotions-add"
          onClick={() => setDraft(draftFrom())}
          className="gap-1.5"
        >
          <Plus className="size-4" aria-hidden /> Nouvelle promotion
        </Button>
      </div>

      {promotions === null ? (
        <p className="text-sm text-shell-subtle">Chargement...</p>
      ) : (
        <>
          {/* Sections écrites en toutes lettres : la visite guidée les cible. */}
          <section
            data-tour="promotions-live"
            aria-labelledby="promo-live"
            className="flex flex-col gap-3"
          >
            {renderGroup(GROUPS[0])}
          </section>
          <section
            data-tour="promotions-upcoming"
            aria-labelledby="promo-upcoming"
            className="flex flex-col gap-3"
          >
            {renderGroup(GROUPS[1])}
          </section>
          <section
            data-tour="promotions-ended"
            aria-labelledby="promo-ended"
            className="flex flex-col gap-3"
          >
            {renderGroup(GROUPS[2])}
          </section>
        </>
      )}

      <PromotionDialog
        draft={draft}
        onClose={() => setDraft(null)}
        onSave={save}
        categories={categories}
        products={products}
      />
    </div>
  );
}

"use client";

import { BadgePercent, Plus, Ticket, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  PromotionDialog,
  draftFrom,
  toInput,
  type PromotionDraft,
} from "@/components/dashboard/promotions/PromotionDialog";
import {
  PromoCodeDialog,
  codeDraftFrom,
  codeToInput,
  type PromoCodeDraft,
} from "@/components/dashboard/promotions/PromoCodeDialog";
import { promotionSummary } from "@/components/storefront/ShopPromotionBanner";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/dateTime";
import { codeValueLabel } from "@/lib/promoCode";
import { campaignImpacts, codeImpacts, type PromotionImpact } from "@/lib/promotionImpact";
import type { Category } from "@/models/category/Category";
import type { Order } from "@/models/order/Order";
import type { Product } from "@/models/product/Product";
import type { Promotion } from "@/models/promotion/Promotion";
import type { PromoCode } from "@/models/promotion/PromoCode";
import { categoryService } from "@/services/CategoryService";
import { orderService } from "@/services/OrderService";
import { productService } from "@/services/ProductService";
import { promoCodeService } from "@/services/PromoCodeService";
import { promotionService } from "@/services/PromotionService";

type Status = "live" | "upcoming" | "ended";

function statusOf(p: Pick<Promotion, "startsAt" | "endsAt">, now: number): Status {
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

const fcfa = (n: number) => `${Math.round(n).toLocaleString("fr-FR")}\u00a0FCFA`;
const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? "s" : ""}`;

/** Bilan d'une campagne ou d'un code (BF-34) : ce qu'il a fait vendre et
 * ce qu'il a coûté en réductions. */
function ImpactLine({ impact, status }: { impact?: PromotionImpact; status: Status }) {
  if (status === "upcoming") return null;
  if (!impact) {
    return <p className="text-xs text-shell-subtle">Aucune commande pour l&apos;instant.</p>;
  }
  return (
    <p className="text-xs text-shell-text">
      <span className="font-medium">{plural(impact.orders, "commande")}</span> · {plural(impact.units, "article")} ·{" "}
      {fcfa(impact.revenue)} de ventes · {fcfa(impact.discount)} de réductions
    </p>
  );
}

/** Libellé des conditions d'un code : « dès 10 000 FCFA · 50 utilisations · 1 par client ». */
function codeConditions(code: PromoCode): string {
  const parts = [
    code.minSubtotal > 0 ? `dès ${fcfa(code.minSubtotal)} d'achats` : "sans minimum",
    code.maxUses === null ? `${code.usedCount} utilisation${code.usedCount > 1 ? "s" : ""}` : `${code.usedCount}/${code.maxUses} utilisations`,
    code.perClient === null ? "sans limite par client" : `${code.perClient} par client`,
  ];
  return parts.join(" · ");
}

/**
 * Promotions de la boutique (BF-30→33, 2026-10-12), réservées au gérant :
 * campagnes en cours, à venir et terminées ; création, modification,
 * fin anticipée, suppression d'une campagne pas encore commencée. Codes
 * promo (BF-32) dans un second onglet ; bilan de chacun (BF-34).
 */
export function PromotionsPageContent({ shopId }: { shopId: string }) {
  const [promotions, setPromotions] = useState<Promotion[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [draft, setDraft] = useState<PromotionDraft | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [tab, setTab] = useState<"campaigns" | "codes">("campaigns");
  const [codes, setCodes] = useState<PromoCode[] | null>(null);
  const [codeDraft, setCodeDraft] = useState<PromoCodeDraft | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const campaignImpact = campaignImpacts(orders);
  const codeImpact = codeImpacts(orders);

  useEffect(() => {
    const stop = promotionService.watchByShop(shopId, setPromotions, () =>
      setPromotions([]),
    );
    const stopCodes = promoCodeService.watchByShop(shopId, setCodes, () => setCodes([]));
    let active = true;
    // Bilan : les commandes de la boutique, lues une fois.
    orderService
      .listByShop(shopId)
      .then((list) => active && setOrders(list))
      .catch(() => {});
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
      stopCodes();
      window.clearInterval(tick);
    };
  }, [shopId]);

  async function save(d: PromotionDraft) {
    await promotionService.save(toInput(d));
    toast.success(d.id ? "Promotion modifiée." : "Promotion créée.");
    setDraft(null);
  }

  async function saveCode(d: PromoCodeDraft) {
    await promoCodeService.save(codeToInput(d));
    toast.success(d.id ? "Code modifié." : "Code créé.");
    setCodeDraft(null);
  }

  async function actOnCode(c: PromoCode, action: "end" | "remove") {
    const question =
      action === "end"
        ? `Arrêter le code ${c.code} maintenant ? Il ne fonctionnera plus.`
        : `Supprimer le code ${c.code} ? Il n'a jamais servi.`;
    if (!window.confirm(question)) return;
    setBusyId(c.id);
    try {
      if (action === "end") await promoCodeService.end(c.id);
      else await promoCodeService.remove(c.id);
      toast.success(action === "end" ? "Code arrêté." : "Code supprimé.");
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : "L'opération a échoué.");
    } finally {
      setBusyId(null);
    }
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
                    <ImpactLine impact={campaignImpact.get(p.id)} status={status} />
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
            {tab === "campaigns"
              ? "Des réductions qui s'appliquent d'elles-mêmes pendant leurs dates, sur toute la boutique, des catégories ou des articles. Le client paie toujours le prix le plus bas, sans cumul."
              : "Des codes que vos clients saisissent en commandant : une réduction sur le montant de la commande, qui s'ajoute aux promotions."}
          </p>
        </div>
        {tab === "campaigns" ? (
          <Button
            data-tour="promotions-add"
            onClick={() => setDraft(draftFrom())}
            className="gap-1.5"
          >
            <Plus className="size-4" aria-hidden /> Nouvelle promotion
          </Button>
        ) : (
          <Button
            data-tour="codes-add"
            onClick={() => setCodeDraft(codeDraftFrom())}
            className="gap-1.5"
          >
            <Plus className="size-4" aria-hidden /> Nouveau code
          </Button>
        )}
      </div>

      <div
        role="tablist"
        aria-label="Type de promotion"
        data-tour="promotions-tabs"
        className="grid w-full max-w-sm grid-cols-2 gap-1 rounded-lg bg-shell-hover p-1"
      >
        {(
          [
            ["campaigns", "Campagnes"],
            ["codes", "Codes promo"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`rounded-md px-3 py-1.5 text-sm ${tab === id ? "bg-shell-surface font-medium text-shell-text shadow-sm" : "text-shell-subtle"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "codes" ? (
        <section data-tour="promotions-codes" aria-label="Codes promo" className="flex flex-col gap-3">
          {codes === null ? (
            <p className="text-sm text-shell-subtle">Chargement...</p>
          ) : codes.length === 0 ? (
            <p className="rounded-xl border border-dashed border-shell-border p-4 text-sm text-shell-subtle">
              Aucun code promo. Créez-en un à partager sur WhatsApp ou les réseaux sociaux.
            </p>
          ) : (
            [...codes]
              .sort((a, b) => {
                const rank = { live: 0, upcoming: 1, ended: 2 };
                return rank[statusOf(a, now)] - rank[statusOf(b, now)] || b.endsAt.toMillis() - a.endsAt.toMillis();
              })
              .map((c) => {
                const status = statusOf(c, now);
                const usedUp = c.maxUses !== null && c.usedCount >= c.maxUses;
                return (
                  <article
                    key={c.id}
                    className="flex flex-col gap-3 rounded-xl border border-shell-border bg-shell-surface p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-shell-accent-soft text-shell-accent">
                        <Ticket className="size-5" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 font-semibold text-shell-text">
                          <span className="font-mono tracking-wide">{c.code}</span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${BADGE[status]}`}>
                            {status === "ended" ? "Terminé" : BADGE_LABEL[status]}
                          </span>
                          {usedUp && status !== "ended" && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                              Épuisé
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-shell-text">{codeValueLabel(c)} sur la commande</p>
                        <p className="text-xs text-shell-subtle">{codeConditions(c)}</p>
                        <p className="text-xs text-shell-subtle">
                          Du {formatDateTime(c.startsAt.toDate())} au {formatDateTime(c.endsAt.toDate())}
                        </p>
                        <ImpactLine impact={codeImpact.get(c.id)} status={status} />
                      </div>
                    </div>
                    {status !== "ended" && (
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => setCodeDraft(codeDraftFrom(c))}>
                          Modifier
                        </Button>
                        {c.usedCount > 0 ? (
                          <Button variant="outline" size="sm" disabled={busyId === c.id} onClick={() => actOnCode(c, "end")}>
                            Arrêter
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" disabled={busyId === c.id} onClick={() => actOnCode(c, "remove")}>
                            Supprimer
                          </Button>
                        )}
                      </div>
                    )}
                  </article>
                );
              })
          )}
        </section>
      ) : promotions === null ? (
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
      <PromoCodeDialog draft={codeDraft} onClose={() => setCodeDraft(null)} onSave={saveCode} />
    </div>
  );
}

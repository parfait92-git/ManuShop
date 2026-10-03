"use client";

import { History, Package, Settings, ShoppingBag, Tag } from "lucide-react";
import { useEffect, useState } from "react";

import { ORDER_STATUS_LABEL } from "@/lib/orderStatus";
import type {
  ActivityLogAction,
  ActivityLogEntry,
} from "@/models/activity/ActivityLogEntry";
import type { OrderStatus } from "@/models/order/OrderStatus";
import { activityLogService } from "@/services/ActivityLogService";

const ACTION_ICON: Record<ActivityLogEntry["targetType"], typeof Package> = {
  product: Package,
  category: Tag,
  shop: Settings,
  order: ShoppingBag,
};

function describe(entry: ActivityLogEntry): string {
  const productName =
    typeof entry.metadata?.productName === "string"
      ? entry.metadata.productName
      : "Produit";
  const categoryName =
    typeof entry.metadata?.categoryName === "string"
      ? entry.metadata.categoryName
      : "Catégorie";
  const clientName =
    typeof entry.metadata?.clientName === "string"
      ? entry.metadata.clientName
      : "un client";
  const orderStatus =
    typeof entry.metadata?.status === "string"
      ? ORDER_STATUS_LABEL[entry.metadata.status as OrderStatus]
      : "";
  const orderReason =
    typeof entry.metadata?.reason === "string" ? entry.metadata.reason : "";
  const orderOutcome =
    entry.metadata?.outcome === "defective" ? "défectueuse" : "retournée";
  const labels: Record<ActivityLogAction, string> = {
    "product.published": `« ${productName} » publié`,
    "product.unpublished": `« ${productName} » dépublié`,
    "product.trashed": `« ${productName} » déplacé vers la corbeille`,
    "product.restored": `« ${productName} » restauré`,
    "category.trashed": `« ${categoryName} » déplacée vers la corbeille`,
    "category.restored": `« ${categoryName} » restaurée`,
    "shop.settings_updated": "Paramètres de la boutique mis à jour",
    "order.created": `Commande créée pour ${clientName}`,
    "order.status_changed": `Commande passée à « ${orderStatus} »`,
    "order.cancelled": `Commande annulée — ${orderReason}`,
    "order.returned": `Commande marquée ${orderOutcome} — ${orderReason}`,
  };
  return labels[entry.action];
}

/** Journal d'activité (BF-98) : lecture seule, triée par date décroissante
 * (le repository ne trie pas — voir `ActivityLogRepository.listByShop`). */
export function ActivityLogPageContent({ shopId }: { shopId: string }) {
  const [entries, setEntries] = useState<ActivityLogEntry[] | null>(null);

  useEffect(() => {
    let active = true;
    activityLogService.listRecent(shopId).then((data) => {
      if (!active) return;
      setEntries(
        [...data].sort(
          (a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()
        )
      );
    });
    return () => {
      active = false;
    };
  }, [shopId]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-shell-text sm:text-3xl">
          Journal d&apos;activité
        </h1>
        <p className="mt-1 text-sm text-shell-subtle">
          Historique des actions effectuées sur votre boutique.
        </p>
      </div>

      <div data-tour="activity-list" className="rounded-xl border border-shell-border bg-shell-surface">
        {entries === null ? (
          <p className="px-6 py-16 text-center text-sm text-shell-subtle">
            Chargement...
          </p>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
            <History className="size-8 text-shell-faint" />
            <p className="text-sm text-shell-subtle">Aucune activité pour le moment.</p>
          </div>
        ) : (
          <ul className="divide-y divide-shell-border">
            {entries.map((entry) => {
              const Icon = ACTION_ICON[entry.targetType];
              return (
                <li
                  key={entry.id}
                  className="flex items-center gap-4 px-4 py-3 sm:px-6"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-shell-hover text-shell-subtle">
                    <Icon className="size-4" />
                  </div>
                  <div className="flex flex-1 flex-col">
                    <p className="text-sm text-shell-muted">{describe(entry)}</p>
                    <p className="text-xs text-shell-subtle">
                      {entry.actorName} ·{" "}
                      {entry.createdAt.toDate().toLocaleString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

"use client";

import { History, Package, Settings, Tag } from "lucide-react";
import { useEffect, useState } from "react";

import type {
  ActivityLogAction,
  ActivityLogEntry,
} from "@/models/activity/ActivityLogEntry";
import { activityLogService } from "@/services/ActivityLogService";

const ACTION_ICON: Record<ActivityLogEntry["targetType"], typeof Package> = {
  product: Package,
  category: Tag,
  shop: Settings,
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
  const labels: Record<ActivityLogAction, string> = {
    "product.published": `« ${productName} » publié`,
    "product.unpublished": `« ${productName} » dépublié`,
    "product.trashed": `« ${productName} » déplacé vers la corbeille`,
    "product.restored": `« ${productName} » restauré`,
    "category.trashed": `« ${categoryName} » déplacée vers la corbeille`,
    "category.restored": `« ${categoryName} » restaurée`,
    "shop.settings_updated": "Paramètres de la boutique mis à jour",
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
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
          Journal d&apos;activité
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Historique des actions effectuées sur votre boutique.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        {entries === null ? (
          <p className="px-6 py-16 text-center text-sm text-slate-500">
            Chargement...
          </p>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
            <History className="size-8 text-slate-300" />
            <p className="text-sm text-slate-500">Aucune activité pour le moment.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {entries.map((entry) => {
              const Icon = ACTION_ICON[entry.targetType];
              return (
                <li
                  key={entry.id}
                  className="flex items-center gap-4 px-4 py-3 sm:px-6"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                    <Icon className="size-4" />
                  </div>
                  <div className="flex flex-1 flex-col">
                    <p className="text-sm text-slate-700">{describe(entry)}</p>
                    <p className="text-xs text-slate-400">
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

"use client";

import { Plus, Store } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/providers/AuthProvider";
import { CreateShopWizard } from "@/components/storefront/CreateShopWizard";
import { Button } from "@/components/ui/button";
import { SUBSCRIPTION_PLANS } from "@/lib/subscriptionPlans";
import type { Shop } from "@/models/shop/Shop";
import { authService } from "@/services/AuthService";
import { shopService } from "@/services/ShopService";

type ShopStatus = "published" | "expired" | "draft";

function statusOf(shop: Shop): ShopStatus {
  if (shop.isPublished) return "published";
  if (
    shop.adminSource === "subscription" &&
    shop.subscriptionExpiresAt &&
    shop.subscriptionExpiresAt.toDate().getTime() < Date.now()
  ) {
    return "expired";
  }
  return "draft";
}

const STATUS_LABEL: Record<ShopStatus, string> = {
  published: "Publiée",
  expired: "Abonnement expiré",
  draft: "Brouillon",
};

const STATUS_CLASS: Record<ShopStatus, string> = {
  published: "bg-emerald-50 text-emerald-700",
  expired: "bg-red-50 text-red-700",
  draft: "bg-slate-100 text-slate-600",
};

function planLabel(shop: Shop): string | null {
  if (!shop.subscriptionPlan) return null;
  return SUBSCRIPTION_PLANS.find((p) => p.id === shop.subscriptionPlan)?.label ?? null;
}

/**
 * "Gestion de boutique" (BF-87) : toutes les boutiques d'un même
 * commerçant. "Gérer" bascule `profile.shopId` (BF-87 : changer de
 * boutique active — voir `AuthService.switchShop`) puis renvoie au
 * dashboard, qui résout déjà tout via `profile.shopId`.
 */
export function ShopManagementPageContent() {
  const { profile, refreshProfile } = useAuth();
  const router = useRouter();
  const [shops, setShops] = useState<Shop[] | null>(null);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  useEffect(() => {
    if (!profile) return;
    let active = true;
    shopService.listMyShops(profile.id).then((data) => {
      if (active) setShops(data);
    });
    return () => {
      active = false;
    };
  }, [profile]);

  async function handleManage(shop: Shop) {
    if (shop.id === profile?.shopId) {
      router.push("/dashboard");
      return;
    }
    setSwitchingId(shop.id);
    try {
      await authService.switchShop(shop.id);
      await refreshProfile();
      router.push("/dashboard");
    } finally {
      setSwitchingId(null);
    }
  }

  if (shops === null) {
    return <p className="text-sm text-muted-foreground">Chargement...</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
          Gestion de boutique
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Retrouvez toutes vos boutiques et basculez entre elles.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shops.map((shop) => {
          const status = statusOf(shop);
          const plan = planLabel(shop);
          return (
            <div
              key={shop.id}
              className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="flex size-12 items-center justify-center rounded-full bg-cyan-50 text-cyan-600">
                <Store className="size-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-950">{shop.name}</p>
                <p className="text-sm text-slate-500">
                  {[shop.address, shop.sector].filter(Boolean).join(" · ") ||
                    "Aucune information"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CLASS[status]}`}
                >
                  {STATUS_LABEL[status]}
                </span>
                {plan && (
                  <span className="text-xs text-slate-400">{plan}</span>
                )}
              </div>
              {shop.subscriptionExpiresAt && (
                <p className="text-xs text-slate-400">
                  Expire le{" "}
                  {shop.subscriptionExpiresAt
                    .toDate()
                    .toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                </p>
              )}
              <Button
                onClick={() => handleManage(shop)}
                disabled={switchingId === shop.id}
                className="mt-auto w-full bg-slate-950 hover:bg-slate-800"
              >
                {switchingId === shop.id ? "..." : "Gérer"}
              </Button>
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => setWizardOpen(true)}
          className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 text-slate-400 hover:border-slate-400 hover:text-slate-600"
        >
          <Plus className="size-6" />
          Créer une nouvelle boutique
        </button>
      </div>

      <CreateShopWizard
        open={wizardOpen}
        onOpenChange={(open) => {
          setWizardOpen(open);
          if (!open && profile) {
            shopService.listMyShops(profile.id).then(setShops);
          }
        }}
      />
    </div>
  );
}

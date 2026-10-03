"use client";

import { Plus, Store } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/providers/AuthProvider";
import { ShareShopLinkButton } from "@/components/dashboard/ShareShopLinkButton";
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
  draft: "bg-shell-hover text-shell-muted",
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
        <h1 className="text-2xl font-semibold tracking-tight text-shell-text sm:text-3xl">
          Gestion de boutique
        </h1>
        <p className="mt-1 text-sm text-shell-subtle">
          Retrouvez toutes vos boutiques et basculez entre elles.
        </p>
      </div>

      <div data-tour="shops-list" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shops.map((shop) => {
          const status = statusOf(shop);
          const plan = planLabel(shop);
          return (
            <div
              key={shop.id}
              className="flex flex-col gap-3 rounded-xl border border-shell-border bg-shell-surface p-4"
            >
              <div className="flex size-12 items-center justify-center rounded-full bg-shell-accent-soft text-shell-accent">
                <Store className="size-5" />
              </div>
              <div>
                <p className="font-semibold text-shell-text">{shop.name}</p>
                <p className="text-sm text-shell-subtle">
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
                  <span className="text-xs text-shell-subtle">{plan}</span>
                )}
              </div>
              {shop.subscriptionExpiresAt && (
                <p className="text-xs text-shell-subtle">
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
              <div className="mt-auto flex flex-col gap-2">
                {status === "published" && (
                  <ShareShopLinkButton
                    shopId={shop.id}
                    shopName={shop.name}
                    className="w-full"
                  />
                )}
                <Button
                  data-tour="shops-manage"
                  onClick={() => handleManage(shop)}
                  disabled={switchingId === shop.id}
                  className="w-full bg-shell-active text-shell-active-text hover:bg-shell-active/90"
                >
                  {switchingId === shop.id ? "..." : "Gérer"}
                </Button>
              </div>
            </div>
          );
        })}

        <button

          data-tour="shops-create"
          type="button"
          onClick={() => setWizardOpen(true)}
          className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-shell-border-strong text-shell-subtle hover:border-shell-border-strong hover:text-shell-muted"
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

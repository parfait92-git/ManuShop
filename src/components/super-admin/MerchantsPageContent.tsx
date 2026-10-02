"use client";

import { ChevronDown, ChevronRight, Store, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import {
  PREMIUM_FEATURES,
  PREMIUM_FEATURE_KEYS,
  type PremiumFeatureKey,
} from "@/lib/premiumFeatures";
import type { MerchantDto, MerchantShopDto } from "@/server/actions/platformAdminActions";
import { platformAdminService } from "@/services/PlatformAdminService";

function ShopPremiumFeatures({
  shop,
  onToggle,
}: {
  shop: MerchantShopDto;
  onToggle: (shopId: string, feature: PremiumFeatureKey, enabled: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">{shop.name}</span>
        <span
          className={`text-xs font-medium ${shop.isPublished ? "text-emerald-600" : "text-muted-foreground"}`}
        >
          {shop.isPublished ? "Publiée" : "Non publiée"}
        </span>
      </div>
      <ul data-tour="merchants-features" className="flex flex-col gap-2">
        {PREMIUM_FEATURE_KEYS.map((key) => {
          const enabled = shop.premiumFeatures.includes(key);
          return (
            <li key={key} className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">
                {PREMIUM_FEATURES[key]}
              </span>
              <Switch
                checked={enabled}
                onCheckedChange={(checked) => onToggle(shop.id, key, checked)}
                aria-label={`${enabled ? "Désactiver" : "Activer"} ${PREMIUM_FEATURES[key]} pour ${shop.name}`}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function MerchantRow({
  merchant,
  onToggleFeature,
}: {
  merchant: MerchantDto;
  onToggleFeature: (shopId: string, feature: PremiumFeatureKey, enabled: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <li>
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-muted/40 sm:px-6"
      >
        <div className="flex min-w-0 flex-col">
          <span className="text-sm font-medium">{merchant.displayName}</span>
          <span className="truncate text-sm text-muted-foreground">
            {merchant.email ?? "—"}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Store className="size-3.5" />
            {merchant.shops.length} boutique{merchant.shops.length > 1 ? "s" : ""}
          </span>
          {expanded ? (
            <ChevronDown className="size-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground" />
          )}
        </div>
      </button>
      {expanded && (
        <div className="flex flex-col gap-3 border-t border-border bg-muted/10 px-4 py-4 sm:px-6">
          {merchant.shops.map((shop) => (
            <ShopPremiumFeatures key={shop.id} shop={shop} onToggle={onToggleFeature} />
          ))}
        </div>
      )}
    </li>
  );
}

/**
 * BF-117/118/119 : un commerçant est déduit des boutiques (groupées par
 * propriétaire) par `listMerchantsAction`, pas d'un rôle sur `users` — la
 * liste complète (commerçant + boutiques + privilèges) arrive en un seul
 * appel, donc chaque ligne se déplie simplement en local plutôt que de
 * recharger une page de détail séparée.
 */
export function MerchantsPageContent() {
  const [merchants, setMerchants] = useState<MerchantDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    platformAdminService
      .listMerchants()
      .then((data) => {
        if (active) setMerchants(data);
      })
      .catch((err) => {
        console.error(
          "MerchantsPageContent : échec du chargement des commerçants",
          err
        );
        if (active) {
          setMerchants([]);
          setError("Échec du chargement des commerçants. Réessayez.");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleToggleFeature(
    shopId: string,
    feature: PremiumFeatureKey,
    enabled: boolean
  ) {
    setMerchants((current) =>
      current?.map((merchant) => ({
        ...merchant,
        shops: merchant.shops.map((shop) =>
          shop.id === shopId
            ? {
                ...shop,
                premiumFeatures: enabled
                  ? [...shop.premiumFeatures, feature]
                  : shop.premiumFeatures.filter((f) => f !== feature),
              }
            : shop
        ),
      })) ?? current
    );

    try {
      await platformAdminService.setShopPremiumFeature(shopId, feature, enabled);
    } catch {
      // Annule la mise à jour optimiste (repasse à l'état inverse).
      setMerchants((current) =>
        current?.map((merchant) => ({
          ...merchant,
          shops: merchant.shops.map((shop) =>
            shop.id === shopId
              ? {
                  ...shop,
                  premiumFeatures: enabled
                    ? shop.premiumFeatures.filter((f) => f !== feature)
                    : [...shop.premiumFeatures, feature],
                }
              : shop
          ),
        })) ?? current
      );
      toast.error("Échec de la mise à jour du privilège. Réessayez.");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Commerçants</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tous les comptes ayant au moins une boutique — dépliez une ligne
          pour activer un privilège premium par boutique, indépendamment de
          son abonnement.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {merchants === null ? (
        <p className="text-sm text-muted-foreground">Chargement...</p>
      ) : merchants.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Users className="size-5" />
          </span>
          <p className="text-sm text-muted-foreground">
            Aucun commerçant pour le moment.
          </p>
        </div>
      ) : (
        <ul data-tour="merchants-list" className="divide-y divide-border rounded-xl border border-border bg-background">
          {merchants.map((merchant) => (
            <MerchantRow
              key={merchant.ownerId}
              merchant={merchant}
              onToggleFeature={handleToggleFeature}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

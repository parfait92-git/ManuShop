"use client";

import { PackageSearch } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  OrderReasonDialog,
  type ReasonTarget,
} from "@/components/dashboard/OrderReasonDialog";
import { InvoiceDownloadButton } from "@/components/orders/InvoiceDownloadButton";
import { Button, buttonVariants } from "@/components/ui/button";
import { ORDER_STATUS_BADGE_CLASS, ORDER_STATUS_LABEL } from "@/lib/orderStatus";
import type { Order } from "@/models/order/Order";
import { hasInvoice } from "@/services/InvoiceService";
import { orderService } from "@/services/OrderService";
import { useMoney } from "@/hooks/useMoney";
import { useShopCurrency } from "@/hooks/useShopCurrency";
import { formatDateTime } from "@/lib/dateTime";

/** BF-75 : suivi de commande côté client — jusque-là explicitement bloqué
 * ("aucune commande n'est jamais écrite dans Firestore"), débloqué par le
 * Module 4. Annulation (BF-23) uniquement tant que `under_review`. */
/** Montant d'une commande dans la devise de sa boutique — un client peut
 * avoir commandé dans plusieurs boutiques, de devises différentes. */
function OrderAmount({ amountXaf, shopId }: { amountXaf: number; shopId: string }) {
  const money = useMoney(useShopCurrency(shopId));
  return <>{money(amountXaf)}</>;
}

export function MyOrdersPageContent({ clientId }: { clientId: string }) {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reasonTarget, setReasonTarget] = useState<ReasonTarget | null>(null);

  // En direct : un statut changé par la boutique (prête, en livraison,
  // livrée…) s'affiche aussitôt, sans recharger — dans le navigateur comme
  // dans l'application installée (2026-10-03).
  useEffect(
    () => orderService.watchByClient(clientId, setOrders, () => setOrders((current) => current ?? [])),
    [clientId]
  );

  async function handleCancelConfirm(reason: string) {
    if (!reasonTarget) return;
    const { orderId } = reasonTarget;
    setReasonTarget(null);
    setBusyId(orderId);
    try {
      await orderService.cancelOrder(orderId, reason);
      setOrders((current) =>
        current
          ? current.map((o) =>
              o.id === orderId
                ? { ...o, status: "cancelled", cancelReason: reason }
                : o
            )
          : current
      );
      toast.success("Commande annulée.");
    } catch {
      toast.error("Échec de l'annulation. Réessayez.");
    } finally {
      setBusyId(null);
    }
  }

  if (orders === null) {
    return <p className="text-sm text-muted-foreground">Chargement...</p>;
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mes commandes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Suivez l&apos;état de vos commandes.
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border py-16 text-center">
          <PackageSearch className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Vous n&apos;avez pas encore de commande.
          </p>
        </div>
      ) : (
        <ul data-tour="my-orders-list" className="flex flex-col gap-3">
          {orders.map((order) => (
            <li
              key={order.id}
              className="flex flex-col gap-2 rounded-xl border border-border p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${ORDER_STATUS_BADGE_CLASS[order.status]}`}
                >
                  {ORDER_STATUS_LABEL[order.status]}
                </span>
                <span className="text-sm text-muted-foreground">
                  {formatDateTime(order.createdAt.toDate())}
                </span>
              </div>
              <p className="text-sm">
                {order.items.map((item) => `${item.name} ×${item.quantity}`).join(", ")}
              </p>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">
                  <OrderAmount amountXaf={order.total} shopId={order.shopId} />
                </span>
                {order.status === "under_review" && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busyId === order.id}
                    onClick={() =>
                      setReasonTarget({ orderId: order.id, kind: "cancel" })
                    }
                  >
                    Annuler
                  </Button>
                )}
                {/* Avis étape par étape (livraison, puis chaque article),
                sur sa propre page — la même que la notification ouvre. */}
                {hasInvoice(order.status) && (
                  <div className="flex flex-wrap justify-end gap-2">
                    {/* Facture PDF, émise à la livraison (BF-26). */}
                    <InvoiceDownloadButton orderId={order.id} dataTour="my-orders-invoice" />
                    {order.status === "delivered" && (
                      <Link
                        href={`/mes-commandes/${order.id}/avis`}
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        Donner mon avis
                      </Link>
                    )}
                  </div>
                )}
              </div>
              {order.cancelReason && (
                <p className="text-xs text-muted-foreground">
                  Motif d&apos;annulation : {order.cancelReason}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <OrderReasonDialog
        key={reasonTarget?.orderId}
        target={reasonTarget}
        onCancel={() => setReasonTarget(null)}
        onConfirm={handleCancelConfirm}
      />

    </div>
  );
}

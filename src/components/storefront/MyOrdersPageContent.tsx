"use client";

import { PackageSearch } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  OrderReasonDialog,
  type ReasonTarget,
} from "@/components/dashboard/OrderReasonDialog";
import {
  ReviewDialog,
  type ReviewSubmission,
  type ReviewTarget,
} from "@/components/storefront/ReviewDialog";
import { Button } from "@/components/ui/button";
import { ORDER_STATUS_BADGE_CLASS, ORDER_STATUS_LABEL } from "@/lib/orderStatus";
import type { Order } from "@/models/order/Order";
import { orderService } from "@/services/OrderService";
import { reviewService } from "@/services/ReviewService";
import { useMoney } from "@/hooks/useMoney";
import { useShopCurrency } from "@/hooks/useShopCurrency";

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
  const [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null);
  // BF-76 : un avis par commande suffit pour ce premier tour — masque le
  // bouton une fois envoyé plutôt que de suivre l'état par article. Un
  // second envoi (article différent de la même commande) resterait
  // possible en rouvrant le dialogue depuis la console, mais l'UI ne le
  // propose plus volontairement.
  const [reviewedOrderIds, setReviewedOrderIds] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    let active = true;
    orderService.listByClient(clientId).then((data) => {
      if (!active) return;
      setOrders(
        [...data].sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
      );
    });
    return () => {
      active = false;
    };
  }, [clientId]);

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

  async function handleSubmitReview(submission: ReviewSubmission) {
    if (!reviewTarget) return;
    const { orderId } = reviewTarget;
    setReviewTarget(null);
    try {
      await reviewService.submitReview({ orderId, ...submission });
      setReviewedOrderIds((current) => new Set(current).add(orderId));
      toast.success("Merci pour votre avis !");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Échec de l'envoi. Réessayez."
      );
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
                  {order.createdAt.toDate().toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              <p className="text-sm">
                {order.items.map((item) => `${item.name} ×${item.quantity}`).join(", ")}
              </p>
              <div className="flex items-center justify-between">
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
                {order.status === "delivered" &&
                  (reviewedOrderIds.has(order.id) ? (
                    <span className="text-sm text-muted-foreground">
                      Merci pour votre avis !
                    </span>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setReviewTarget({ orderId: order.id, items: order.items })
                      }
                    >
                      Laisser un avis
                    </Button>
                  ))}
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

      <ReviewDialog
        key={reviewTarget?.orderId}
        target={reviewTarget}
        onCancel={() => setReviewTarget(null)}
        onSubmit={handleSubmitReview}
      />
    </div>
  );
}

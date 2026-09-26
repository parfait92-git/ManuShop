"use client";

import { Plus, ShoppingBag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  ManualOrderDialog,
} from "@/components/dashboard/ManualOrderDialog";
import {
  OrderReasonDialog,
  type ReasonTarget,
} from "@/components/dashboard/OrderReasonDialog";
import { ORDER_STATUS_BADGE_CLASS, ORDER_STATUS_LABEL } from "@/lib/orderStatus";
import type { Order } from "@/models/order/Order";
import type { OrderStatus } from "@/models/order/OrderStatus";
import type { Product } from "@/models/product/Product";
import { activityLogService } from "@/services/ActivityLogService";
import { orderService } from "@/services/OrderService";
import { productService } from "@/services/ProductService";

const FILTERABLE_STATUSES = Object.keys(ORDER_STATUS_LABEL) as OrderStatus[];

function itemsSummary(order: Order): string {
  const count = order.items.reduce((sum, item) => sum + item.quantity, 0);
  return `${count} article${count > 1 ? "s" : ""}`;
}

/** Actions de progression disponibles depuis le statut courant — la
 * cloture (retour/défectueux) et l'annulation passent par `OrderReasonDialog`
 * plutôt que par un bouton direct, un motif étant obligatoire (BF-23/96/97). */
function OrderRowActions({
  order,
  busy,
  onAdvance,
  onOpenReason,
}: {
  order: Order;
  busy: boolean;
  onAdvance: (status: Extract<OrderStatus, "ready_for_delivery" | "delivering" | "delivered">) => void;
  onOpenReason: (target: ReasonTarget) => void;
}) {
  switch (order.status) {
    case "under_review":
      return (
        <div className="flex justify-end gap-1.5">
          <Button size="sm" disabled={busy} onClick={() => onAdvance("ready_for_delivery")}>
            Prêt pour livraison
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => onOpenReason({ orderId: order.id, kind: "cancel" })}
          >
            Annuler
          </Button>
        </div>
      );
    case "ready_for_delivery":
      return (
        <div className="flex justify-end">
          <Button size="sm" disabled={busy} onClick={() => onAdvance("delivering")}>
            Livraison en cours
          </Button>
        </div>
      );
    case "delivering":
      return (
        <div className="flex justify-end">
          <Button size="sm" disabled={busy} onClick={() => onAdvance("delivered")}>
            Marquer livré
          </Button>
        </div>
      );
    case "delivered":
      return (
        <div className="flex justify-end gap-1.5">
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => onOpenReason({ orderId: order.id, kind: "returned" })}
          >
            Retourné
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => onOpenReason({ orderId: order.id, kind: "defective" })}
          >
            Défectueux
          </Button>
        </div>
      );
    default:
      return null;
  }
}

export function OrdersPageContent({ shopId }: { shopId: string }) {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reasonTarget, setReasonTarget] = useState<ReasonTarget | null>(null);
  const [manualOrderOpen, setManualOrderOpen] = useState(false);
  const [creatingManualOrder, setCreatingManualOrder] = useState(false);

  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get("status");
    if (status) {
      queueMicrotask(() => setStatusFilter(status));
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      orderService.listByShop(shopId),
      productService.listActive(shopId),
    ]).then(([orderList, productList]) => {
      if (!active) return;
      setOrders(
        [...orderList].sort(
          (a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()
        )
      );
      setProducts(productList);
    });
    return () => {
      active = false;
    };
  }, [shopId]);

  const filtered = useMemo(() => {
    if (!orders) return [];
    return statusFilter
      ? orders.filter((order) => order.status === statusFilter)
      : orders;
  }, [orders, statusFilter]);

  function updateLocalOrder(orderId: string, patch: Partial<Order>) {
    setOrders((current) =>
      current
        ? current.map((o) => (o.id === orderId ? { ...o, ...patch } : o))
        : current
    );
  }

  async function handleAdvance(
    order: Order,
    status: Extract<OrderStatus, "ready_for_delivery" | "delivering" | "delivered">
  ) {
    setBusyId(order.id);
    try {
      await orderService.advanceStatus(order.id, status);
      if (profile) {
        await activityLogService.logOrderStatusChanged(
          { shopId, actorId: profile.id, actorName: profile.displayName },
          order.id,
          status
        );
      }
      updateLocalOrder(order.id, { status });
      toast.success(`Commande passée à « ${ORDER_STATUS_LABEL[status]} ».`);
    } catch {
      toast.error("Échec de la mise à jour. Réessayez.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReasonConfirm(reason: string) {
    if (!reasonTarget) return;
    const { orderId, kind } = reasonTarget;
    setReasonTarget(null);
    setBusyId(orderId);
    try {
      if (kind === "cancel") {
        await orderService.cancelOrder(orderId, reason);
        if (profile) {
          await activityLogService.logOrderCancelled(
            { shopId, actorId: profile.id, actorName: profile.displayName },
            orderId,
            reason
          );
        }
        updateLocalOrder(orderId, { status: "cancelled", cancelReason: reason });
        toast.success("Commande annulée.");
      } else {
        await orderService.markReturned(orderId, kind, reason);
        if (profile) {
          await activityLogService.logOrderReturned(
            { shopId, actorId: profile.id, actorName: profile.displayName },
            orderId,
            kind,
            reason
          );
        }
        updateLocalOrder(orderId, { status: kind, returnReason: reason });
        toast.success("Commande mise à jour, stock réincrémenté.");
      }
    } catch {
      toast.error("Échec de l'opération. Réessayez.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreateManualOrder(input: {
    clientName: string;
    clientPhone: string;
    clientAddress: string;
    items: Order["items"];
  }) {
    setCreatingManualOrder(true);
    try {
      const subtotal = input.items.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0
      );
      const { orderId } = await orderService.createOrder({
        shopId,
        clientName: input.clientName,
        clientPhone: input.clientPhone,
        clientAddress: input.clientAddress,
        items: input.items,
        subtotal,
        total: subtotal,
        manual: true,
      });
      if (profile) {
        await activityLogService.logOrderCreated(
          { shopId, actorId: profile.id, actorName: profile.displayName },
          orderId,
          input.clientName
        );
      }
      const created = await orderService.getOrder(orderId);
      if (created) {
        setOrders((current) => (current ? [created, ...current] : [created]));
      }
      setManualOrderOpen(false);
      toast.success("Commande créée.");
    } catch {
      toast.error("Échec de la création. Réessayez.");
    } finally {
      setCreatingManualOrder(false);
    }
  }

  if (orders === null) {
    return <p className="text-sm text-muted-foreground">Chargement...</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            Commandes
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Suivez et traitez les commandes de votre boutique.
          </p>
        </div>
        <Button className="w-fit gap-1.5" onClick={() => setManualOrderOpen(true)}>
          <Plus className="size-4" />
          Commande manuelle
        </Button>
      </div>

      <Select
        value={statusFilter}
        onChange={(event) => setStatusFilter(event.target.value)}
        aria-label="Filtrer par statut"
        className="h-10 sm:w-64"
      >
        <option value="">Tous les statuts</option>
        {FILTERABLE_STATUSES.map((status) => (
          <option key={status} value={status}>
            {ORDER_STATUS_LABEL[status]}
          </option>
        ))}
      </Select>

      <div className="rounded-xl border border-slate-200 bg-white">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
            <ShoppingBag className="size-8 text-slate-300" />
            <p className="text-sm text-slate-500">
              {orders.length === 0
                ? "Aucune commande pour le moment."
                : "Aucune commande ne correspond à ce filtre."}
            </p>
          </div>
        ) : (
          <div className="-mx-4 overflow-x-auto sm:-mx-6">
            <table className="w-full min-w-160 border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  <th className="px-4 py-2 sm:px-6">Client</th>
                  <th className="px-4 py-2">Articles</th>
                  <th className="px-4 py-2">Total</th>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Statut</th>
                  <th className="px-4 py-2 text-right sm:pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((order) => (
                  <tr key={order.id}>
                    <td className="px-4 py-3 sm:px-6">
                      <p className="font-medium text-slate-900">
                        {order.clientName}
                      </p>
                      {!order.clientId && (
                        <p className="text-xs text-slate-400">
                          Commande manuelle
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {itemsSummary(order)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                      {order.total.toLocaleString("fr-FR")} FCFA
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                      {order.createdAt.toDate().toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${ORDER_STATUS_BADGE_CLASS[order.status]}`}
                      >
                        {ORDER_STATUS_LABEL[order.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 sm:pr-6">
                      <OrderRowActions
                        order={order}
                        busy={busyId === order.id}
                        onAdvance={(status) => handleAdvance(order, status)}
                        onOpenReason={setReasonTarget}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <OrderReasonDialog
        key={reasonTarget?.orderId}
        target={reasonTarget}
        onCancel={() => setReasonTarget(null)}
        onConfirm={handleReasonConfirm}
      />

      <ManualOrderDialog
        open={manualOrderOpen}
        onOpenChange={setManualOrderOpen}
        products={products}
        submitting={creatingManualOrder}
        onSubmit={handleCreateManualOrder}
      />
    </div>
  );
}

import type { OrderStatus } from "@/models/order/OrderStatus";

/** Libellés français partagés entre le tableau de bord (BF-22) et le suivi
 * client (BF-75) — une seule source de vérité pour ne pas les faire dériver. */
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  under_review: "En cours d'analyse",
  ready_for_delivery: "Prêt pour la livraison",
  delivering: "Livraison en cours",
  delivered: "Livré",
  returned: "Retourné",
  defective: "Défectueux",
  cancelled: "Annulée",
};

export const ORDER_STATUS_BADGE_CLASS: Record<OrderStatus, string> = {
  under_review: "bg-amber-50 text-amber-700",
  ready_for_delivery: "bg-sky-50 text-sky-700",
  delivering: "bg-indigo-50 text-indigo-700",
  delivered: "bg-emerald-50 text-emerald-700",
  returned: "bg-slate-100 text-slate-600",
  defective: "bg-red-50 text-red-700",
  cancelled: "bg-slate-100 text-slate-500",
};

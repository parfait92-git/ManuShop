import "server-only";

import type { Firestore } from "firebase-admin/firestore";

import type { OrderStatus } from "@/models/order/OrderStatus";
import { feedbackPath } from "@/server/notifications";

import { sendPush, shopTeamIds, superAdminIds } from "./sendPush";

/**
 * Notifications push de la plateforme (BF-58→61, BF-116, 2026-10-04) :
 * qui reçoit quoi, et le texte. Appelées après l'écriture de l'événement ;
 * `sendPush` n'échoue jamais.
 */

/** Une notification ne fait jamais échouer l'action qui la déclenche, même
 * si la recherche des destinataires échoue. */
async function guard(run: () => Promise<number>): Promise<number> {
  try {
    return await run();
  } catch (error) {
    console.error("Notification push non envoyée", error);
    return 0;
  }
}

const fcfa = (amount: number) =>
  `${Math.round(amount).toLocaleString("fr-FR").replace(/[\u00a0\u202f]/g, " ")} FCFA`;
const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? "s" : ""}`;

/** Nouvelle commande en ligne → l'équipe de la boutique. */
export function pushNewOrder(
  db: Firestore,
  input: {
    shopId: string;
    orderId: string;
    clientName: string;
    units: number;
    total: number;
  },
) {
  return guard(() =>
    shopTeamIds(db, input.shopId).then((team) =>
      sendPush(db, team, {
        title: "Nouvelle commande",
        body: `${input.clientName} · ${plural(input.units, "article")} · ${fcfa(input.total)}`,
        link: "/dashboard/orders?status=under_review",
        tag: `order-${input.orderId}`,
      }),
    ),
  );
}

export interface StockAlert {
  name: string;
  stock: number;
}

/** Stock passé sous le seuil d'alerte (ou épuisé) → l'équipe. */
export function pushStockAlerts(
  db: Firestore,
  shopId: string,
  alerts: StockAlert[],
) {
  if (alerts.length === 0) return Promise.resolve(0);
  const out = alerts.filter((a) => a.stock <= 0);
  const title =
    out.length > 0
      ? alerts.length > 1
        ? "Ruptures et stocks faibles"
        : "Rupture de stock"
      : "Stock faible";
  const body = alerts
    .map((a) =>
      a.stock <= 0 ? `${a.name} : épuisé` : `${a.name} : plus que ${a.stock}`,
    )
    .join(" · ");
  return guard(() =>
    shopTeamIds(db, shopId).then((team) =>
      sendPush(db, team, {
        title,
        body,
        link: "/dashboard/products",
        tag: `stock-${shopId}`,
      }),
    ),
  );
}

const STATUS_MESSAGE: Partial<
  Record<OrderStatus, { title: string; body: string }>
> = {
  ready_for_delivery: {
    title: "Commande prête",
    body: "est prête : elle part bientôt en livraison.",
  },
  delivering: {
    title: "Commande en route",
    body: "est en cours de livraison.",
  },
  delivered: {
    title: "Commande livrée",
    body: "est livrée. Donnez votre avis sur la livraison et vos articles !",
  },
  cancelled: {
    title: "Commande annulée",
    body: "a été annulée par la boutique.",
  },
  returned: {
    title: "Retour enregistré",
    body: "est enregistrée comme retournée.",
  },
  defective: {
    title: "Article défectueux",
    body: "est enregistrée comme défectueuse.",
  },
};

/** Nouveau statut d'une commande → le client (s'il a un compte). */
export function pushOrderStatus(
  db: Firestore,
  input: {
    clientId?: string;
    orderId: string;
    status: OrderStatus;
    shopName: string;
  },
) {
  const message = STATUS_MESSAGE[input.status];
  const clientId = input.clientId;
  if (!clientId || !message) return Promise.resolve(0);
  return guard(() =>
    sendPush(db, [clientId], {
      title: message.title,
      body: `${input.shopName} : votre commande ${message.body}`,
      link:
        input.status === "delivered"
          ? feedbackPath(input.orderId)
          : "/mes-commandes",
      tag: `order-${input.orderId}`,
    }),
  );
}

/** Commande annulée par le client lui-même → l'équipe. */
export function pushOrderCancelledByClient(
  db: Firestore,
  input: { shopId: string; orderId: string; clientName: string },
) {
  return guard(() =>
    shopTeamIds(db, input.shopId).then((team) =>
      sendPush(db, team, {
        title: "Commande annulée",
        body: `${input.clientName} a annulé sa commande.`,
        link: "/dashboard/orders",
        tag: `order-${input.orderId}`,
      }),
    ),
  );
}

/** Nouvel avis client → l'équipe. */
export function pushNewReview(
  db: Firestore,
  input: { shopId: string; clientName: string; subject: string },
) {
  return guard(() =>
    shopTeamIds(db, input.shopId).then((team) =>
      sendPush(db, team, {
        title: "Nouvel avis client",
        body: `${input.clientName} a donné son avis sur ${input.subject}.`,
        link: "/dashboard/avis",
        tag: `review-${input.shopId}`,
      }),
    ),
  );
}

/** Réponse de la boutique à un avis → le client. */
export function pushReviewReply(
  db: Firestore,
  input: { clientId: string; shopName: string; orderId: string },
) {
  return guard(() =>
    sendPush(db, [input.clientId], {
      title: "Réponse à votre avis",
      body: `${input.shopName} a répondu à votre avis.`,
      link: feedbackPath(input.orderId),
    }),
  );
}

/** Message d'un commerçant → les Super Admins. */
export function pushSupportMessage(
  db: Firestore,
  input: { shopName: string; subject: string },
) {
  return guard(() =>
    superAdminIds(db).then((admins) =>
      sendPush(db, admins, {
        title: "Nouveau message",
        body: `${input.shopName} : ${input.subject}`,
        link: "/super-admin/messages",
        tag: "support",
      }),
    ),
  );
}

/** Réponse du Super Admin → l'auteur du message. */
export function pushSupportReply(
  db: Firestore,
  input: { senderId: string; subject: string },
) {
  return guard(() =>
    sendPush(db, [input.senderId], {
      title: "Réponse de l'équipe ManuShop",
      body: `À propos de « ${input.subject} »`,
      link: "/dashboard/support",
    }),
  );
}

/** Demande d'achat premium → les Super Admins. */
export function pushPremiumRequest(
  db: Firestore,
  input: { shopName: string; itemLabel: string },
) {
  return guard(() =>
    superAdminIds(db).then((admins) =>
      sendPush(db, admins, {
        title: "Demande d'achat premium",
        body: `${input.shopName} : ${input.itemLabel}`,
        link: "/super-admin/offres-premium",
        tag: "premium",
      }),
    ),
  );
}

/** Demande premium validée ou refusée → le gérant qui l'a faite. */
export function pushPremiumDecision(
  db: Firestore,
  input: { userId: string; itemLabel: string; approved: boolean },
) {
  return guard(() =>
    sendPush(db, [input.userId], {
      title: input.approved ? "Achat validé" : "Demande refusée",
      body: input.approved
        ? `${input.itemLabel} est à vous : vous pouvez l'utiliser dès maintenant.`
        : `Votre demande pour ${input.itemLabel} n'a pas été validée.`,
      link: "/dashboard/themes",
    }),
  );
}

/** Promotion qui se termine demain → l'équipe (tâche planifiée). */
export function pushPromoEnding(
  db: Firestore,
  input: { shopId: string; products: string[] },
) {
  if (input.products.length === 0) return Promise.resolve(0);
  return guard(() =>
    shopTeamIds(db, input.shopId).then((team) =>
      sendPush(db, team, {
        title:
          input.products.length > 1
            ? "Promotions bientôt terminées"
            : "Promotion bientôt terminée",
        body: `Se termine demain soir : ${input.products.join(", ")}.`,
        link: "/dashboard/products",
        tag: `promo-${input.shopId}`,
      }),
    ),
  );
}

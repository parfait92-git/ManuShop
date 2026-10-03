import "server-only";

import type { Firestore } from "firebase-admin/firestore";

import { isCurrencyCode } from "@/lib/currency";
import { computeInvoice, formatInvoiceMoney } from "@/lib/invoice";
import type { OrderStatus } from "@/models/order/OrderStatus";
import { INVOICES_COLLECTION, invoiceSignedText } from "@/server/invoices/issueInvoice";
import {
  checkHistory,
  HISTORY_SUBCOLLECTION,
  type HistoryEvent,
} from "@/server/integrity/orderHistory";
import { checkSignature, formatVerificationCode } from "@/server/integrity/signing";

/** Libellés de la chronologie publique. */
const STATUS_STEP: Record<OrderStatus, string> = {
  under_review: "Commande reçue par la boutique",
  ready_for_delivery: "Commande prête pour la livraison",
  delivering: "Commande en cours de livraison",
  delivered: "Commande livrée",
  returned: "Commande retournée",
  defective: "Commande déclarée défectueuse",
  cancelled: "Commande annulée",
};

export interface TimelineStep {
  label: string;
  at: Date;
  /** Étape enregistrée dans l'historique signé (sinon reconstituée à partir
   * des dates de la commande, pour une commande plus ancienne). */
  signed: boolean;
  /** Retour, défaut ou annulation : affichée en couleur d'alerte. */
  warning?: boolean;
}

/**
 * - `authentic` : facture signée, signature valide, historique intact ;
 * - `unsigned` : facture conforme aux enregistrements de ManuShop, mais
 *   sans signature numérique (émise avant sa mise en place, ou clé de
 *   signature pas encore configurée) ;
 * - `tampered` : une signature ne correspond plus, ou l'historique a été
 *   modifié.
 */
export type VerificationState = "authentic" | "unsigned" | "tampered";

export interface InvoiceVerification {
  state: VerificationState;
  shopId: string;
  sellerName: string;
  code: string;
  number: string;
  issuedAt: Date;
  /** « F. B. » : la page est publique, le client n'y est pas nommé. */
  clientInitials: string;
  items: { name: string; quantity: number; total: string }[];
  discount: string | null;
  total: string;
  currencyLabel: string;
  status: OrderStatus;
  timeline: TimelineStep[];
  /** Historique en partie reconstitué (commande antérieure au journal
   * signé). */
  partialHistory: boolean;
}

export function clientInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Client";
  return parts
    .slice(0, 3)
    .map((part) => `${part.charAt(0).toUpperCase()}.`)
    .join(" ");
}

const toDate = (value: unknown): Date | null => {
  if (value && typeof (value as { toDate?: unknown }).toDate === "function") {
    return (value as { toDate(): Date }).toDate();
  }
  return null;
};

/**
 * Vérifie une facture à partir de son code (QR code ou saisie) : relit la
 * facture, revérifie sa signature et toute la chaîne d'historique de la
 * commande, et prépare ce que la page publique peut montrer — jamais le
 * téléphone, l'adresse ni le nom complet du client, ni les motifs
 * d'annulation ou de retour. `null` si aucun code ne correspond.
 */
export async function verifyInvoiceByCode(
  db: Firestore,
  code: string
): Promise<InvoiceVerification | null> {
  const found = await db
    .collection(INVOICES_COLLECTION)
    .where("verificationCode", "==", code)
    .limit(1)
    .get();
  if (found.empty) return null;
  const invoice = found.docs[0].data();
  const orderId = found.docs[0].id;

  const orderRef = db.collection("orders").doc(orderId);
  const [orderSnapshot, historySnapshot] = await Promise.all([
    orderRef.get(),
    orderRef.collection(HISTORY_SUBCOLLECTION).get(),
  ]);
  const order = orderSnapshot.data() ?? {};
  const history = checkHistory(
    orderId,
    order,
    historySnapshot.docs.map((d) => d.data() as HistoryEvent)
  );

  const invoiceCheck = checkSignature(invoiceSignedText(invoice), invoice);
  const tampered =
    invoiceCheck === "invalid" ||
    !history.intact ||
    history.signatures === "invalid" ||
    !orderSnapshot.exists ||
    order.total !== invoice.total;
  const fullySigned =
    invoiceCheck === "valid" && (history.signatures === "valid" || history.signatures === "none");
  const state: VerificationState = tampered ? "tampered" : fullySigned ? "authentic" : "unsigned";

  // Chronologie : l'historique signé, complété pour une commande plus
  // ancienne par les dates connues de la commande.
  const timeline: TimelineStep[] = history.events.map((event) =>
    event.fact.type === "invoice"
      ? { label: `Facture ${event.fact.number} émise`, at: new Date(event.atMs), signed: !!event.signature }
      : {
          label: STATUS_STEP[event.fact.status] ?? event.fact.status,
          at: new Date(event.atMs),
          signed: !!event.signature,
          warning: ["returned", "defective", "cancelled"].includes(event.fact.status),
        }
  );
  const createdAt = toDate(order.createdAt);
  const startsWithCreation =
    history.events[0]?.fact.type === "status" && history.events[0].fact.status === "under_review";
  const partialHistory = !startsWithCreation;
  if (partialHistory && createdAt) {
    timeline.unshift({ label: STATUS_STEP.under_review, at: createdAt, signed: false });
  }
  const issuedAt = new Date(invoice.issuedAtMs ?? toDate(invoice.issuedAt)?.getTime() ?? Date.now());
  if (!timeline.some((step) => step.label.startsWith("Facture"))) {
    timeline.push({ label: `Facture ${invoice.number} émise`, at: issuedAt, signed: false });
  }
  const status = order.status as OrderStatus;
  if (!history.events.some((e) => e.fact.type === "status" && e.fact.status === status)) {
    const updatedAt = toDate(order.updatedAt);
    if (updatedAt && status !== "under_review") {
      timeline.push({
        label: STATUS_STEP[status] ?? status,
        at: updatedAt,
        signed: false,
        warning: ["returned", "defective", "cancelled"].includes(status),
      });
    }
  }
  timeline.sort((a, b) => a.at.getTime() - b.at.getTime());

  const currency = isCurrencyCode(invoice.currency) ? invoice.currency : "XAF";
  const rate = typeof invoice.rateToXaf === "number" && invoice.rateToXaf > 0 ? invoice.rateToXaf : 1;
  const money = (amount: number) => formatInvoiceMoney(amount, currency, rate);
  const { lines, totals } = computeInvoice(invoice.items ?? [], invoice.vatRate ?? 0, {
    discount: invoice.discount ?? 0,
    total: invoice.total,
  });

  return {
    state,
    shopId: invoice.shopId,
    sellerName: invoice.seller?.name ?? "Boutique",
    code: formatVerificationCode(code),
    number: invoice.number,
    issuedAt,
    clientInitials: clientInitials(invoice.client?.name ?? ""),
    items: lines.map((line) => ({ name: line.name, quantity: line.quantity, total: money(line.totalTtc) })),
    discount: totals.discount > 0 ? money(totals.discount) : null,
    total: money(totals.totalTtc),
    currencyLabel: currency === "XAF" ? "FCFA" : currency,
    status,
    timeline,
    partialHistory,
  };
}

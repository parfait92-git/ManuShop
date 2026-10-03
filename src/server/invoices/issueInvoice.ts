import "server-only";

import { FieldValue, type DocumentData, type Firestore } from "firebase-admin/firestore";

import { buildRates, displayCurrency, shopCurrency } from "@/lib/currency";
import {
  formatInvoiceNumber,
  resolveInvoiceColor,
  resolveVatRate,
} from "@/lib/invoice";
import { NotFoundError, ValidationError } from "@/server/errors";

export const INVOICES_COLLECTION = "invoices";
/** Compteur de numérotation, un document par boutique — jamais lu ni
 * écrit par le navigateur (`firestore.rules`). */
const INVOICE_COUNTERS_COLLECTION = "invoiceCounters";

/** Statuts d'une commande qui a été livrée : sa facture existe (ou peut
 * être émise, pour une commande livrée avant l'arrivée des factures). Une
 * commande retournée ou défectueuse garde la facture de sa vente. */
export const INVOICED_STATUSES = ["delivered", "returned", "defective"] as const;

export function isInvoicedStatus(status: string): boolean {
  return (INVOICED_STATUSES as readonly string[]).includes(status);
}

const optional = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

/**
 * Émet la facture d'une commande livrée, si elle ne l'est pas déjà, et
 * renvoie ses données (BF-24/28/29). Appelée à la livraison
 * (`updateOrderStatusAction`) et, par sécurité, au téléchargement : une
 * commande livrée avant l'arrivée des factures, ou dont l'émission a
 * échoué, en obtient une à ce moment-là.
 *
 * Transaction : le numéro est pris au compteur de la boutique et la
 * facture écrite d'un seul tenant — deux livraisons simultanées ne peuvent
 * ni partager un numéro ni en sauter un. Idempotente : une facture déjà
 * émise est renvoyée telle quelle, jamais renumérotée.
 */
export async function ensureInvoice(
  db: Firestore,
  orderId: string
): Promise<DocumentData> {
  const invoiceRef = db.collection(INVOICES_COLLECTION).doc(orderId);

  return db.runTransaction(async (transaction) => {
    const existing = await transaction.get(invoiceRef);
    if (existing.exists) return existing.data()!;

    const orderSnapshot = await transaction.get(db.collection("orders").doc(orderId));
    if (!orderSnapshot.exists) throw new NotFoundError("Commande introuvable.");
    const order = orderSnapshot.data()!;
    if (!isInvoicedStatus(order.status)) {
      throw new ValidationError("La facture est disponible une fois la commande livrée.");
    }

    const counterRef = db.collection(INVOICE_COUNTERS_COLLECTION).doc(order.shopId);
    const [shopSnapshot, counterSnapshot, configSnapshot] = await Promise.all([
      transaction.get(db.collection("shops").doc(order.shopId)),
      transaction.get(counterRef),
      transaction.get(db.collection("configuration").doc("general")),
    ]);
    const shop = shopSnapshot.data() ?? {};
    const sequence = ((counterSnapshot.data()?.last as number | undefined) ?? 0) + 1;

    // Devise de la boutique au taux du jour, figés : sans taux connu (dollar
    // pas encore saisi par le Super Admin), la facture reste en FCFA.
    const rates = buildRates(configSnapshot.data()?.usdToXafRate);
    const currency = displayCurrency(shopCurrency(shop as { currency?: string }), rates);

    const invoice = {
      orderId,
      shopId: order.shopId,
      ...(order.clientId ? { clientId: order.clientId } : {}),
      sequence,
      number: formatInvoiceNumber(sequence),
      issuedAt: FieldValue.serverTimestamp(),
      seller: {
        name: optional(shop.name) ?? "Boutique",
        address: optional(shop.address) ?? "",
        phone: optional(shop.phone) ?? "",
        ...(optional(shop.publicContactEmail) ? { email: optional(shop.publicContactEmail) } : {}),
        ...(optional(shop.logo) ? { logo: optional(shop.logo) } : {}),
        ...(optional(shop.taxId) ? { taxId: optional(shop.taxId) } : {}),
        ...(optional(shop.tradeRegister) ? { tradeRegister: optional(shop.tradeRegister) } : {}),
      },
      client: {
        name: optional(order.clientName) ?? "Client",
        phone: optional(order.clientPhone) ?? "",
        address: optional(order.clientAddress) ?? "",
      },
      items: (order.items as { name: string; quantity: number; unitPrice: number }[]).map(
        (item) => ({ name: item.name, quantity: item.quantity, unitPrice: item.unitPrice })
      ),
      discount: (order.discount as number | undefined) ?? 0,
      total: order.total as number,
      vatRate: resolveVatRate(shop.vatRate),
      currency,
      rateToXaf: rates[currency]!,
      color: resolveInvoiceColor(shop.themeColor),
    };

    transaction.set(counterRef, { last: sequence }, { merge: true });
    transaction.set(invoiceRef, invoice);
    // `issuedAt` vaut ici le marqueur d'horodatage serveur : l'appelant qui
    // affiche la facture tout de suite utilise la date du moment.
    return { ...invoice, issuedAt: new Date() };
  });
}

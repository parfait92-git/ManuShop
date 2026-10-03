import "server-only";

import { Timestamp, type DocumentData, type Firestore } from "firebase-admin/firestore";

import { buildRates, displayCurrency, shopCurrency } from "@/lib/currency";
import {
  formatInvoiceNumber,
  resolveInvoiceColor,
  resolveVatRate,
} from "@/lib/invoice";
import { NotFoundError, ValidationError } from "@/server/errors";
import { appendHistoryEvent, nextHistoryEvent } from "@/server/integrity/orderHistory";
import {
  canonicalJson,
  generateVerificationCode,
  getSigningKeys,
  signText,
} from "@/server/integrity/signing";

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
 * Texte signé d'une facture (2026-10-03) : tout son contenu, en JSON
 * canonique, sauf la signature elle-même et l'horodatage Firestore
 * (remplacé par `issuedAtMs`, un nombre exact). Changer un seul chiffre,
 * un article ou le code de vérification invalide la signature.
 */
export function invoiceSignedText(invoice: DocumentData): string {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { signature, keyId, issuedAt, ...content } = invoice;
  return canonicalJson({ v: 1, ...content });
}

/** Ajoute à une facture son code de vérification et sa signature. */
function sealInvoice(invoice: DocumentData): DocumentData {
  const sealed = { ...invoice, verificationCode: invoice.verificationCode ?? generateVerificationCode() };
  const signed = signText(invoiceSignedText(sealed));
  return signed ? { ...sealed, signature: signed.signature, keyId: signed.keyId } : sealed;
}

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
    if (existing.exists) {
      const current = existing.data()!;
      if (current.verificationCode && (current.signature || !getSigningKeys())) return current;
      // Facture émise avant la signature numérique, ou avant que la clé ne
      // soit configurée : scellée maintenant, même numéro et même contenu.
      const sealed = sealInvoice({
        ...current,
        issuedAtMs: current.issuedAtMs ?? current.issuedAt.toMillis(),
      });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { issuedAt, ...update } = sealed;
      transaction.update(invoiceRef, update);
      return sealed;
    }

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

    const issuedAt = Timestamp.now();
    const invoice = sealInvoice({
      orderId,
      shopId: order.shopId,
      ...(order.clientId ? { clientId: order.clientId } : {}),
      sequence,
      number: formatInvoiceNumber(sequence),
      issuedAt,
      issuedAtMs: issuedAt.toMillis(),
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
    });

    transaction.set(counterRef, { last: sequence }, { merge: true });
    transaction.set(invoiceRef, invoice);
    // L'émission entre dans l'historique signé de la commande.
    const head = appendHistoryEvent(
      db,
      transaction,
      orderId,
      nextHistoryEvent(orderId, order, { type: "invoice", number: invoice.number }, issuedAt.toDate())
    );
    transaction.update(orderSnapshot.ref, head);
    return invoice;
  });
}

import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { createElement, type ReactElement } from "react";

import { getAdminDb } from "@/lib/firebaseAdmin";
import { verifyIdToken } from "@/lib/verifyIdToken";
import { NotFoundError, ValidationError } from "@/server/errors";
import { InvoiceDocument, type InvoiceDocumentData } from "@/server/invoices/InvoiceDocument";
import { ensureInvoice, isInvoicedStatus } from "@/server/invoices/issueInvoice";
import { loadInvoiceLogo } from "@/server/invoices/loadInvoiceLogo";

export const runtime = "nodejs";

function error(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

/**
 * Facture PDF d'une commande livrée (BF-24→29, 2026-10-03), téléchargée
 * par le client (« Mes commandes ») ou par l'équipe de la boutique
 * (Commandes). Le jeton Firebase de l'appelant est envoyé dans
 * `Authorization` : seuls le client de la commande et le gérant ou un
 * vendeur de SA boutique y ont accès. Le PDF est produit à chaque
 * demande à partir de la facture figée à l'émission (`invoices`), il n'est
 * pas stocké.
 */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ orderId: string }> }
) {
  const caller = await verifyIdToken(request.headers.get("authorization"));
  if (!caller) return error("Authentification requise.", 401);

  const { orderId } = await ctx.params;
  const db = getAdminDb();
  const orderSnapshot = await db.collection("orders").doc(orderId).get();
  if (!orderSnapshot.exists) return error("Commande introuvable.", 404);
  const order = orderSnapshot.data()!;

  let allowed = order.clientId === caller.uid;
  if (!allowed) {
    const user = (await db.collection("users").doc(caller.uid).get()).data();
    allowed = !!user && ["admin", "seller"].includes(user.role) && user.shopId === order.shopId;
  }
  // Même réponse qu'une commande inexistante : ne révèle pas qu'elle existe.
  if (!allowed) return error("Commande introuvable.", 404);
  if (!isInvoicedStatus(order.status)) {
    return error("La facture est disponible une fois la commande livrée.", 409);
  }

  let invoice;
  try {
    invoice = await ensureInvoice(db, orderId);
  } catch (err) {
    if (err instanceof NotFoundError) return error(err.message, 404);
    if (err instanceof ValidationError) return error(err.message, 409);
    throw err;
  }

  const issuedAt: Date =
    invoice.issuedAt instanceof Date ? invoice.issuedAt : invoice.issuedAt.toDate();
  const data: InvoiceDocumentData = {
    number: invoice.number,
    orderId,
    issuedAt,
    seller: invoice.seller,
    client: invoice.client,
    items: invoice.items,
    discount: invoice.discount,
    total: invoice.total,
    vatRate: invoice.vatRate,
    currency: invoice.currency,
    rateToXaf: invoice.rateToXaf,
    color: invoice.color,
  };
  const logo = await loadInvoiceLogo(invoice.seller.logo);
  // `InvoiceDocument` renvoie un <Document> : le type attendu par
  // `renderToBuffer` ne le voit pas à travers le composant.
  const pdf = await renderToBuffer(
    createElement(InvoiceDocument, { invoice: data, logo }) as unknown as ReactElement<DocumentProps>
  );

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="facture-${invoice.number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}

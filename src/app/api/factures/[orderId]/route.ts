import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { createElement, type ReactElement } from "react";

import { validTimeZone } from "@/lib/dateTime";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { verifyIdToken } from "@/lib/verifyIdToken";
import { NotFoundError, ValidationError } from "@/server/errors";
import { resolveInvoiceColor } from "@/lib/invoice";
import { shopPath } from "@/lib/seo";
import { ACTIVE_THEME_DOC } from "@/models/theme/ShopTheme";
import { resolveTheme } from "@/themes/registry";
import { formatVerificationCode } from "@/server/integrity/signing";
import {
  InvoiceDocument,
  type InvoiceDocumentData,
  type InvoiceVerificationBlock,
} from "@/server/invoices/InvoiceDocument";
import { ensureInvoice, isInvoicedStatus } from "@/server/invoices/issueInvoice";
import { loadInvoiceLogo } from "@/server/invoices/loadInvoiceLogo";
import { getPublicSiteUrl } from "@/server/seo/publicData";

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
/**
 * QR code de la facture (2026-10-03) : il mène à la page de vérification,
 * à l'adresse de la boutique, sur le domaine officiel en vigueur (réglé par
 * le Super Admin). Calculé à chaque téléchargement : un changement de
 * domaine s'applique aux factures téléchargées ensuite.
 */
async function verificationBlock(
  shopId: string,
  code: string | undefined
): Promise<InvoiceVerificationBlock | null> {
  if (!code) return null;
  const site = await getPublicSiteUrl();
  const url = `${site}${shopPath(shopId)}/verifier/${code}`;
  const qr = await QRCode.toBuffer(url, { type: "png", errorCorrectionLevel: "M", margin: 0, scale: 8 });
  return { qr, code: formatVerificationCode(code), host: new URL(site).host };
}

/**
 * Couleur de la facture au moment du téléchargement (2026-10-03, demande
 * de l'utilisateur) : celle choisie par le commerçant, sinon celle du thème
 * appliqué **aujourd'hui** — un changement de thème se voit aussitôt, même
 * sur une facture déjà émise. La couleur n'est que de la présentation : le
 * contenu signé de la facture (montants, articles, numéro…) ne change pas,
 * et sa signature reste valable.
 */
async function currentInvoiceColor(
  db: ReturnType<typeof getAdminDb>,
  shopId: string,
  issuedColor: string
): Promise<string> {
  try {
    const shopRef = db.collection("shops").doc(shopId);
    const [shop, active] = await Promise.all([
      shopRef.get(),
      shopRef.collection("themes").doc(ACTIVE_THEME_DOC).get(),
    ]);
    return resolveInvoiceColor(shop.data()?.themeColor, resolveTheme(active.data()?.themeId).invoiceColor);
  } catch {
    return issuedColor;
  }
}

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
    // Heure du lecteur (`?tz=` envoyé par le navigateur) ; à défaut, le
    // Cameroun — le serveur, lui, tourne en UTC.
    timeZone: validTimeZone(new URL(request.url).searchParams.get("tz")) ?? "Africa/Douala",
    seller: invoice.seller,
    client: invoice.client,
    items: invoice.items,
    discount: invoice.discount,
    total: invoice.total,
    vatRate: invoice.vatRate,
    currency: invoice.currency,
    rateToXaf: invoice.rateToXaf,
    color: await currentInvoiceColor(db, invoice.shopId ?? order.shopId, invoice.color),
  };
  const [logo, verification] = await Promise.all([
    loadInvoiceLogo(invoice.seller.logo),
    verificationBlock(invoice.shopId ?? order.shopId, invoice.verificationCode),
  ]);
  // `InvoiceDocument` renvoie un <Document> : le type attendu par
  // `renderToBuffer` ne le voit pas à travers le composant.
  const pdf = await renderToBuffer(
    createElement(InvoiceDocument, { invoice: data, logo, verification }) as unknown as ReactElement<DocumentProps>
  );

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="facture-${invoice.number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}

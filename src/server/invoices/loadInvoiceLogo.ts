import "server-only";

import type { InvoiceLogo } from "@/server/invoices/InvoiceDocument";

const TIMEOUT_MS = 5000;
const MAX_BYTES = 2 * 1024 * 1024;

/** Cloudinary convertit à la volée : PNG (le PDF ne lit ni le WebP ni le
 * SVG), réduit à la taille utile. */
function pdfFriendlyUrl(url: string): string {
  const match = url.match(/^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/);
  return match ? `${match[1]}f_png,w_256,h_256,c_limit/${match[2]}` : url;
}

/**
 * Télécharge le logo de la boutique pour la facture. Un logo absent,
 * injoignable, trop lourd ou dans un format que le PDF ne sait pas lire
 * (WebP, SVG…) donne `null` : la facture affiche alors l'initiale de la
 * boutique plutôt que d'échouer.
 */
export async function loadInvoiceLogo(url: string | undefined): Promise<InvoiceLogo> {
  if (!url || !/^https:\/\//.test(url)) return null;
  try {
    const response = await fetch(pdfFriendlyUrl(url), { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) return null;
    const type = response.headers.get("content-type") ?? "";
    const format = type.includes("png") ? "png" : /jpe?g/.test(type) ? "jpg" : null;
    if (!format) return null;
    const data = Buffer.from(await response.arrayBuffer());
    if (data.byteLength === 0 || data.byteLength > MAX_BYTES) return null;
    return { data, format };
  } catch {
    return null;
  }
}

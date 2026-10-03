import { auth } from "@/lib/firebase";

/** Statuts d'une commande qui a été livrée, donc facturée (même liste que
 * `INVOICED_STATUSES` côté serveur). */
const INVOICED_STATUSES = ["delivered", "returned", "defective"];

export function hasInvoice(status: string): boolean {
  return INVOICED_STATUSES.includes(status);
}

function filenameFrom(disposition: string | null, orderId: string): string {
  return disposition?.match(/filename="([^"]+)"/)?.[1] ?? `facture-${orderId}.pdf`;
}

/**
 * Factures (BF-26, 2026-10-03) : le PDF est produit par le serveur
 * (`/api/factures/[orderId]`), qui vérifie que l'appelant est le client de
 * la commande ou l'équipe de la boutique.
 */
export class InvoiceService {
  async download(orderId: string): Promise<void> {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("Vous devez être connecté.");

    const response = await fetch(`/api/factures/${encodeURIComponent(orderId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error ?? "Impossible de télécharger la facture. Réessayez.");
    }

    const url = URL.createObjectURL(await response.blob());
    try {
      const link = document.createElement("a");
      link.href = url;
      link.download = filenameFrom(response.headers.get("content-disposition"), orderId);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } finally {
      // Laisse au navigateur le temps de démarrer le téléchargement.
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    }
  }
}

export const invoiceService = new InvoiceService();

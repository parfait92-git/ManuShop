"use client";

import { FileDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { invoiceService } from "@/services/InvoiceService";

/** Télécharge la facture PDF d'une commande livrée (client et commerçant). */
export function InvoiceDownloadButton({
  orderId,
  dataTour,
}: {
  orderId: string;
  dataTour?: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      await invoiceService.download(orderId);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Impossible de télécharger la facture. Réessayez."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      data-tour={dataTour}
      type="button"
      variant="outline"
      size="sm"
      disabled={loading}
      onClick={handleClick}
      aria-label={loading ? "Préparation de la facture..." : "Télécharger la facture"}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <FileDown className="size-4" aria-hidden />
      )}
      Facture
    </Button>
  );
}

"use client";

import { toCsv } from "@/lib/stockReport";
import type { ReportDocumentProps } from "@/components/dashboard/reports/ReportDocument";

function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** CSV (Excel, tableurs) : produit dans le navigateur, sans serveur. */
export function downloadCsv(props: Pick<ReportDocumentProps, "table">, filename: string): void {
  saveBlob(new Blob([toCsv(props.table)], { type: "text/csv;charset=utf-8" }), filename);
}

/**
 * PDF produit dans le navigateur. Le moteur PDF n'est chargé qu'au moment
 * du clic : il n'alourdit pas la page pour qui ne télécharge rien.
 */
export async function downloadPdf(props: ReportDocumentProps, filename: string): Promise<void> {
  const [{ pdf }, { ReportDocument }, { createElement }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/components/dashboard/reports/ReportDocument"),
    import("react"),
  ]);
  // `ReportDocument` renvoie un <Document> : le type attendu par `pdf` ne
  // le voit pas à travers le composant.
  const blob = await pdf(createElement(ReportDocument, props) as Parameters<typeof pdf>[0]).toBlob();
  saveBlob(blob, filename);
}

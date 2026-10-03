/**
 * Factures (BF-24→29, 2026-10-03) — fonctions pures partagées par
 * l'émission (serveur), le PDF et le formulaire des Paramètres.
 *
 * Choix de l'utilisateur :
 * - couleur de la facture choisie par le commerçant (`Shop.themeColor`) ;
 * - TVA réglée par boutique (`Shop.vatRate`, 0 par défaut). Les prix payés
 *   par les clients sont **TTC** : le HT et la TVA en sont déduits, jamais
 *   ajoutés par-dessus ;
 * - NIU et RCCM facultatifs, imprimés au pied s'ils sont remplis.
 */

import type { CurrencyCode } from "@/lib/currency";

/** Bleu du modèle de facture fourni par l'utilisateur. */
export const DEFAULT_INVOICE_COLOR = "#3B5BA5";

/** Couleurs proposées dans les Paramètres (en plus du choix libre). */
export const INVOICE_COLOR_PRESETS = [
  { value: "#3B5BA5", label: "Bleu" },
  { value: "#0E7490", label: "Bleu canard" },
  { value: "#047857", label: "Vert" },
  { value: "#B45309", label: "Ocre" },
  { value: "#B91C1C", label: "Rouge" },
  { value: "#BE185D", label: "Framboise" },
  { value: "#6D28D9", label: "Violet" },
  { value: "#1F2937", label: "Anthracite" },
] as const;

/** Taux normal de TVA au Cameroun (19,25 %, centimes additionnels
 * communaux compris) — proposé, jamais imposé. */
export const CAMEROON_VAT_RATE = 19.25;

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX_COLOR.test(value);
}

/** Couleur utilisable, ou celle par défaut. */
export function resolveInvoiceColor(value: unknown): string {
  return isHexColor(value) ? value.toUpperCase() : DEFAULT_INVOICE_COLOR;
}

/** Taux de TVA utilisable (0 à 100 %, deux décimales), 0 sinon. */
export function resolveVatRate(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) {
    return 0;
  }
  return Math.round(value * 100) / 100;
}

/** Numéro affiché : « F-00012 ». Séquentiel et continu par boutique
 * (BF-28). */
export function formatInvoiceNumber(sequence: number): string {
  return `F-${String(sequence).padStart(5, "0")}`;
}

export interface InvoiceItemInput {
  name: string;
  quantity: number;
  /** Prix unitaire payé, TTC, en FCFA. */
  unitPrice: number;
}

export interface InvoiceLine {
  name: string;
  quantity: number;
  unitPriceHt: number;
  unitPriceTtc: number;
  totalVat: number;
  totalTtc: number;
}

export interface InvoiceTotals {
  /** Somme des lignes, TTC, avant remise. */
  subtotalTtc: number;
  discount: number;
  totalHt: number;
  totalVat: number;
  totalTtc: number;
}

/** TTC → HT pour un taux donné (en %). */
function excludingVat(amountTtc: number, vatRate: number): number {
  return amountTtc / (1 + vatRate / 100);
}

/**
 * Lignes et totaux d'une facture, en FCFA non arrondis (l'arrondi se fait à
 * l'affichage, dans la devise de la facture). Les totaux partent du
 * montant réellement payé (`total` de la commande, remise déduite), pas de
 * la somme de lignes arrondies.
 */
export function computeInvoice(
  items: InvoiceItemInput[],
  vatRate: number,
  order: { discount: number; total: number }
): { lines: InvoiceLine[]; totals: InvoiceTotals } {
  const lines = items.map((item) => {
    const totalTtc = item.unitPrice * item.quantity;
    return {
      name: item.name,
      quantity: item.quantity,
      unitPriceTtc: item.unitPrice,
      unitPriceHt: excludingVat(item.unitPrice, vatRate),
      totalTtc,
      totalVat: totalTtc - excludingVat(totalTtc, vatRate),
    };
  });
  const totalTtc = order.total;
  const totalHt = excludingVat(totalTtc, vatRate);
  return {
    lines,
    totals: {
      subtotalTtc: lines.reduce((sum, line) => sum + line.totalTtc, 0),
      discount: order.discount,
      totalHt,
      totalVat: totalTtc - totalHt,
      totalTtc,
    },
  };
}

/**
 * Montant en FCFA → texte de la facture, dans sa devise, au taux figé à
 * l'émission (`rateToXaf` : combien de FCFA vaut une unité). Espaces
 * ordinaires plutôt que les espaces fines insécables d'`Intl` : les
 * polices standard du PDF ne les ont pas.
 */
export function formatInvoiceMoney(
  amountXaf: number,
  currency: CurrencyCode,
  rateToXaf: number
): string {
  const digits = currency === "XAF" ? 0 : 2;
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
    .format(amountXaf / rateToXaf)
    .replace(/[  ]/g, " ");
}

/** « 19,25 % » */
export function formatVatRate(vatRate: number): string {
  return `${vatRate.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %`.replace(
    /[  ]/g,
    " "
  );
}

/** Caractères que les polices standard du PDF (WinAnsi) savent dessiner :
 * Latin-1 et les quelques signes de Windows-1252 (€, œ, guillemets…). Le
 * reste (émojis, autres alphabets) serait imprimé en caractères illisibles. */
const CP1252_EXTRAS = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";

export function toPdfText(value: string): string {
  return Array.from(value.normalize("NFC"))
    .map((char) => {
      const code = char.codePointAt(0)!;
      if (code === 0x202f || code === 0x2009) return " ";
      if ((code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff)) return char;
      if (CP1252_EXTRAS.includes(char)) return char;
      if (char === "\n") return char;
      return "";
    })
    .join("")
    .replace(/ {2,}/g, " ")
    .trim();
}

import "server-only";

import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { CurrencyCode } from "@/lib/currency";
import {
  computeInvoice,
  formatInvoiceMoney,
  formatVatRate,
  toPdfText,
  type InvoiceItemInput,
} from "@/lib/invoice";
import { formatDateTime } from "@/lib/dateTime";

/** Données d'une facture prêtes à imprimer (voir `Invoice`, dates déjà
 * converties). */
export interface InvoiceDocumentData {
  number: string;
  orderId: string;
  issuedAt: Date;
  /** Fuseau horaire de l'appareil qui télécharge (ex. « Europe/Paris »),
   * pour la date d'émission imprimée. */
  timeZone?: string;
  seller: {
    name: string;
    address: string;
    phone: string;
    email?: string;
    taxId?: string;
    tradeRegister?: string;
  };
  client: { name: string; phone: string; address: string };
  items: InvoiceItemInput[];
  discount: number;
  total: number;
  vatRate: number;
  currency: CurrencyCode;
  rateToXaf: number;
  color: string;
}

/** Logo déjà téléchargé (PNG ou JPEG), ou absent : un rond à l'initiale
 * de la boutique le remplace. */
export type InvoiceLogo = { data: Buffer; format: "png" | "jpg" } | null;

/** Bloc de vérification (2026-10-03) : QR code menant à la page de
 * vérification, et code à saisir à la main. */
export interface InvoiceVerificationBlock {
  qr: Buffer;
  /** « MS-7K4PQ-9X2MB » */
  code: string;
  /** Domaine officiel, ex. « manu-shop.vercel.app ». */
  host: string;
}

const GREY = "#6B7280";
const TEXT = "#1F2937";
const RULE = "#E5E7EB";

const styles = StyleSheet.create({
  // Marge basse : la place du pied de page (positionné en absolu, il ne
  // compte pas dans la mise en page des lignes).
  page: { paddingTop: 36, paddingBottom: 150, paddingHorizontal: 40, fontSize: 9, color: TEXT, fontFamily: "Helvetica" },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 },
  title: { fontSize: 34, fontFamily: "Helvetica-Bold" },
  logo: { width: 64, height: 64, objectFit: "contain" },
  logoFallback: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  logoInitial: { color: "#FFFFFF", fontSize: 26, fontFamily: "Helvetica-Bold" },
  party: { flexDirection: "row", marginBottom: 14 },
  partyLabel: { width: 100, fontFamily: "Helvetica-Bold" },
  partyName: { fontFamily: "Helvetica-Bold", color: "#4B5563", marginBottom: 3 },
  partyLine: { color: "#4B5563", marginBottom: 2 },
  meta: { flexDirection: "row", marginTop: 4, marginBottom: 14 },
  metaCell: { flex: 1, paddingRight: 8 },
  metaLabel: { fontFamily: "Helvetica-Bold", marginBottom: 4 },
  info: { marginBottom: 16 },
  infoLabel: { fontFamily: "Helvetica-Bold", marginBottom: 2 },
  infoText: { color: GREY },
  tableHeader: { flexDirection: "row", paddingVertical: 9, paddingHorizontal: 8 },
  tableHeaderText: { color: "#FFFFFF", fontFamily: "Helvetica-Bold" },
  row: { flexDirection: "row", paddingVertical: 9, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: RULE },
  cellText: { color: "#4B5563" },
  right: { textAlign: "right" },
  totals: { marginTop: 14, alignSelf: "flex-end", width: 230 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  totalLabel: { fontFamily: "Helvetica-Bold" },
  totalValue: { fontFamily: "Helvetica-Bold", textAlign: "right" },
  // Pied de page : deux blocs positionnés chacun en absolu, à hauteur
  // fixe, pour qu'ils tombent au même endroit sur chaque page.
  footerColumns: { position: "absolute", left: 40, right: 40, bottom: 32, height: 104, flexDirection: "row", paddingTop: 8, borderTopWidth: 1, borderTopColor: "#9CA3AF" },
  verify: { width: 112, alignItems: "center" },
  verifyCaption: { fontFamily: "Helvetica-Bold", fontSize: 6.5, textAlign: "center", marginBottom: 3 },
  verifyQr: { width: 58, height: 58 },
  verifyCode: { fontFamily: "Courier-Bold", fontSize: 7, marginTop: 3 },
  verifyHost: { fontSize: 5.5, color: GREY, marginTop: 1, textAlign: "center" },
  footerColumn: { flex: 1, paddingRight: 10 },
  footerTitle: { fontFamily: "Helvetica-Bold", fontSize: 7.5, marginBottom: 2 },
  footerText: { fontSize: 7.5, color: "#4B5563", marginBottom: 1.5 },
  band: { position: "absolute", left: 0, right: 0, bottom: 0, height: 24, alignItems: "center", justifyContent: "center" },
  bandText: { color: "#FFFFFF", fontSize: 7.5 },
});

/** Colonnes du tableau : avec TVA, comme le modèle ; sans, version simple. */
function columns(withVat: boolean) {
  return withVat
    ? [
        { key: "name", label: "Description", flex: 3.1 },
        { key: "quantity", label: "Quantité", flex: 0.9, right: true },
        { key: "unitHt", label: "Prix unitaire HT", flex: 1.5, right: true },
        { key: "rate", label: "% TVA", flex: 0.9, right: true },
        { key: "vat", label: "Total TVA", flex: 1.3, right: true },
        { key: "ttc", label: "Total TTC", flex: 1.5, right: true },
      ]
    : [
        { key: "name", label: "Description", flex: 4 },
        { key: "quantity", label: "Quantité", flex: 1, right: true },
        { key: "unitTtc", label: "Prix unitaire", flex: 1.6, right: true },
        { key: "ttc", label: "Total", flex: 1.6, right: true },
      ];
}

function Party({ label, name, lines }: { label: string; name: string; lines: string[] }) {
  return (
    <View style={styles.party}>
      <Text style={styles.partyLabel}>{label}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.partyName}>{toPdfText(name)}</Text>
        {lines.filter(Boolean).map((line, index) => (
          <Text key={index} style={styles.partyLine}>
            {toPdfText(line)}
          </Text>
        ))}
      </View>
    </View>
  );
}

/**
 * Facture PDF (BF-26/29, 2026-10-03), sur le modèle fourni par
 * l'utilisateur, aux couleurs et au logo de la boutique.
 *
 * Plusieurs pages si les articles débordent : l'en-tête (titre, logo,
 * vendeur, client, références) et l'en-tête du tableau sont `fixed`, donc
 * répétés à l'identique sur chaque page ; une ligne n'est jamais coupée
 * entre deux pages ; les totaux viennent après la dernière ligne, donc sur
 * la dernière page, sans jamais être coupés eux non plus. Le pied de page
 * (coordonnées, numéro de page, signature ManuShop) est sur chaque page.
 */
export function InvoiceDocument({
  invoice,
  logo,
  verification = null,
}: {
  invoice: InvoiceDocumentData;
  logo: InvoiceLogo;
  verification?: InvoiceVerificationBlock | null;
}) {
  const withVat = invoice.vatRate > 0;
  const { lines, totals } = computeInvoice(invoice.items, invoice.vatRate, invoice);
  const money = (amount: number) => formatInvoiceMoney(amount, invoice.currency, invoice.rateToXaf);
  const cols = columns(withVat);
  const issued = formatDateTime(invoice.issuedAt, "long", invoice.timeZone);
  const sellerName = toPdfText(invoice.seller.name) || "Boutique";

  const cell = (line: (typeof lines)[number], key: string) => {
    switch (key) {
      case "name":
        return toPdfText(line.name);
      case "quantity":
        return String(line.quantity);
      case "unitHt":
        return money(line.unitPriceHt);
      case "unitTtc":
        return money(line.unitPriceTtc);
      case "rate":
        return formatVatRate(invoice.vatRate);
      case "vat":
        return money(line.totalVat);
      default:
        return money(line.totalTtc);
    }
  };

  const renderRow = (line: (typeof lines)[number], key: number) => (
    <View key={key} style={styles.row} wrap={false}>
      {cols.map((col) => (
        <Text key={col.key} style={[styles.cellText, { flex: col.flex }, col.right ? styles.right : {}]}>
          {cell(line, col.key)}
        </Text>
      ))}
    </View>
  );

  return (
    <Document
      title={`Facture ${invoice.number} - ${sellerName}`}
      author={sellerName}
      creator="ManuShop"
      producer="ManuShop"
      language="fr"
    >
      <Page size="A4" style={styles.page}>
        {/* En-tête répété sur chaque page. */}
        <View fixed>
          <View style={styles.headerTop}>
            <Text style={[styles.title, { color: invoice.color }]}>Facture</Text>
            {logo ? (
              // eslint-disable-next-line jsx-a11y/alt-text -- Image PDF, pas une balise <img>.
              <Image src={logo} style={styles.logo} />
            ) : (
              <View style={[styles.logoFallback, { backgroundColor: invoice.color }]}>
                <Text style={styles.logoInitial}>{sellerName.charAt(0).toUpperCase()}</Text>
              </View>
            )}
          </View>

          <Party
            label="Vendeur"
            name={sellerName}
            lines={[invoice.seller.address, invoice.seller.phone]}
          />
          <Party
            label="Client"
            name={invoice.client.name}
            lines={[invoice.client.address, invoice.client.phone]}
          />

          <View style={styles.meta}>
            {[
              ["Date de facturation", issued],
              ["Numéro de facture", invoice.number],
              ["Commande", invoice.orderId.slice(0, 8).toUpperCase()],
              ["Devise", invoice.currency === "XAF" ? "FCFA" : invoice.currency],
            ].map(([label, value]) => (
              <View key={label} style={styles.metaCell}>
                <Text style={styles.metaLabel}>{label}</Text>
                <Text>{value}</Text>
              </View>
            ))}
          </View>

          <View style={styles.info}>
            <Text style={styles.infoLabel}>Informations additionnelles :</Text>
            <Text style={styles.infoText}>
              {withVat
                ? `Prix TTC, TVA de ${formatVatRate(invoice.vatRate)} incluse. Merci pour votre achat !`
                : "TVA non applicable. Merci pour votre achat !"}
            </Text>
          </View>

          <View style={[styles.tableHeader, { backgroundColor: invoice.color }]}>
            {cols.map((col) => (
              <Text
                key={col.key}
                style={[styles.tableHeaderText, { flex: col.flex }, col.right ? styles.right : {}]}
              >
                {col.label}
              </Text>
            ))}
          </View>
        </View>

        {lines.slice(0, -1).map(renderRow)}

        {/* La dernière ligne et les totaux, d'un seul tenant : s'ils ne
        tiennent pas en bas de page, ils passent ensemble sur la suivante —
        jamais de totaux sous un tableau vide. */}
        <View wrap={false}>
          {lines.length > 0 && renderRow(lines[lines.length - 1], lines.length - 1)}
          <View style={styles.totals}>
            {totals.discount > 0 && (
              <>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Sous-total</Text>
                  <Text style={styles.totalValue}>{money(totals.subtotalTtc)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Remise</Text>
                  <Text style={styles.totalValue}>- {money(totals.discount)}</Text>
                </View>
              </>
            )}
            {withVat && (
              <>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total HT</Text>
                  <Text style={styles.totalValue}>{money(totals.totalHt)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total TVA</Text>
                  <Text style={styles.totalValue}>{money(totals.totalVat)}</Text>
                </View>
              </>
            )}
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: invoice.color }]}>
                {withVat ? "Total TTC" : "Total"}
              </Text>
              <Text style={[styles.totalValue, { color: invoice.color }]}>{money(totals.totalTtc)}</Text>
            </View>
          </View>
        </View>

        {/* Pied de page, sur chaque page. */}
        <View style={styles.footerColumns} fixed>
          <View style={styles.footerColumn}>
            <Text style={styles.footerTitle}>{sellerName}</Text>
            {invoice.seller.address && (
              <Text style={styles.footerText}>{toPdfText(invoice.seller.address)}</Text>
            )}
            {invoice.seller.taxId && (
              <Text style={styles.footerText}>NIU : {toPdfText(invoice.seller.taxId)}</Text>
            )}
            {invoice.seller.tradeRegister && (
              <Text style={styles.footerText}>RCCM : {toPdfText(invoice.seller.tradeRegister)}</Text>
            )}
          </View>
          <View style={styles.footerColumn}>
            <Text style={styles.footerTitle}>Coordonnées</Text>
            {invoice.seller.phone && (
              <Text style={styles.footerText}>Téléphone : {toPdfText(invoice.seller.phone)}</Text>
            )}
            {invoice.seller.email && (
              <Text style={styles.footerText}>E-mail : {toPdfText(invoice.seller.email)}</Text>
            )}
          </View>
          <View style={styles.footerColumn}>
            <Text style={styles.footerTitle}>Facture {invoice.number}</Text>
            <Text
              style={styles.footerText}
              render={({ pageNumber, totalPages }) => `Page ${pageNumber} sur ${totalPages}`}
            />
          </View>
          {verification && (
            <View style={styles.verify}>
              <Text style={[styles.verifyCaption, { color: invoice.color }]}>
                Vérifiez la signature numérique
              </Text>
              {/* eslint-disable-next-line jsx-a11y/alt-text -- Image PDF, pas une balise <img>. */}
              <Image src={{ data: verification.qr, format: "png" }} style={styles.verifyQr} />
              <Text style={styles.verifyCode}>{verification.code}</Text>
              <Text style={styles.verifyHost}>ou sur {verification.host}/verifier</Text>
            </View>
          )}
        </View>
        <View style={[styles.band, { backgroundColor: invoice.color }]} fixed>
          <Text style={styles.bandText}>Facture émise avec ManuShop</Text>
        </View>
      </Page>
    </Document>
  );
}

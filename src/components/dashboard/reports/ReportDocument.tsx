import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { toPdfText } from "@/lib/invoice";
import type { ReportTable } from "@/lib/stockReport";

/** Rapport PDF générique (2026-10-03) : un tableau, puis ses totaux. */
export interface ReportDocumentProps {
  title: string;
  shopName: string;
  /** Période, ou date de génération. */
  subtitle: string;
  generatedAt: string;
  /** Couleur de la boutique (celle de ses factures). */
  color: string;
  table: ReportTable;
  totals: [string, string][];
}

const styles = StyleSheet.create({
  page: { paddingTop: 32, paddingBottom: 56, paddingHorizontal: 32, fontSize: 8.5, color: "#1F2937", fontFamily: "Helvetica" },
  title: { fontSize: 20, fontFamily: "Helvetica-Bold" },
  shop: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 4 },
  subtitle: { fontSize: 9, color: "#4B5563", marginTop: 2, marginBottom: 14 },
  header: { flexDirection: "row", paddingVertical: 7, paddingHorizontal: 6 },
  headerText: { color: "#FFFFFF", fontFamily: "Helvetica-Bold" },
  row: { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  zebra: { backgroundColor: "#F9FAFB" },
  right: { textAlign: "right" },
  totals: { marginTop: 14, alignSelf: "flex-end", width: 260 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  totalLabel: { fontFamily: "Helvetica-Bold" },
  footer: { position: "absolute", left: 32, right: 32, bottom: 22, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: "#6B7280" },
  empty: { paddingVertical: 20, textAlign: "center", color: "#6B7280" },
});

/** Largeur relative d'une colonne, selon ce qu'elle contient : nom de
 * l'article large, montants moyens, petits nombres et oui/non étroits. */
function flexOf(header: string, index: number): number {
  if (header === "Article" || (index === 0 && header !== "Date")) return 2.4;
  if (header === "Commande / note") return 1.9;
  if (/^(Catégorie|Mouvement|Par|Date)$/.test(header)) return 1.3;
  if (/^(Variation|Stock après)$/.test(header)) return 0.8;
  if (/Prix|Valeur/.test(header)) return 1.25;
  if (/^(Stock|Seuil|Publié)$/.test(header)) return 0.6;
  if (/^(Statut)$/.test(header)) return 0.85;
  return 1;
}

/** Paysage quand les colonnes ne tiennent pas en largeur sur un A4 droit
 * (état du stock du gérant, mouvements de stock). */
function landscape(headers: string[]): boolean {
  return headers.reduce((sum, h, i) => sum + flexOf(h, i), 0) > 9;
}

/** Espace entre deux colonnes : les valeurs ne se touchent jamais. */
const CELL = { paddingHorizontal: 3 };

export function ReportDocument({ title, shopName, subtitle, generatedAt, color, table, totals }: ReportDocumentProps) {
  return (
    <Document title={`${title} - ${toPdfText(shopName)}`} author={toPdfText(shopName)} creator="ManuShop" producer="ManuShop" language="fr">
      <Page size="A4" orientation={landscape(table.headers) ? "landscape" : "portrait"} style={styles.page}>
        <View fixed>
          <Text style={[styles.title, { color }]}>{title}</Text>
          <Text style={styles.shop}>{toPdfText(shopName)}</Text>
          <Text style={styles.subtitle}>{toPdfText(subtitle)}</Text>
          <View style={[styles.header, { backgroundColor: color }]}>
            {table.headers.map((h, i) => (
              <Text key={h} style={[styles.headerText, CELL, { flex: flexOf(h, i) }, table.numeric[i] ? styles.right : {}]}>
                {toPdfText(h)}
              </Text>
            ))}
          </View>
        </View>

        {table.rows.length === 0 ? (
          <Text style={styles.empty}>Aucune donnée pour ce rapport.</Text>
        ) : (
          table.rows.map((row, r) => (
            <View key={r} style={[styles.row, r % 2 ? styles.zebra : {}]} wrap={false}>
              {row.map((value, i) => (
                <Text key={i} style={[CELL, { flex: flexOf(table.headers[i], i) }, table.numeric[i] ? styles.right : {}]}>
                  {toPdfText(String(value))}
                </Text>
              ))}
            </View>
          ))
        )}

        <View style={styles.totals} wrap={false}>
          {totals.map(([label, value]) => (
            <View key={label} style={styles.totalRow}>
              <Text style={styles.totalLabel}>{toPdfText(label)}</Text>
              <Text style={{ color }}>{toPdfText(value)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.footer} fixed>
          <Text>{toPdfText(`Généré le ${generatedAt} · Rapport émis avec ManuShop`)}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} sur ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

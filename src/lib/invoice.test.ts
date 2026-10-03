import {
  computeInvoice,
  customInvoiceColor,
  DEFAULT_INVOICE_COLOR,
  INVOICE_COLOR_PRESETS,
  formatInvoiceMoney,
  formatInvoiceNumber,
  formatVatRate,
  resolveInvoiceColor,
  resolveVatRate,
  toPdfText,
} from "./invoice";

describe("invoice", () => {
  it("numbers invoices sequentially, zero-padded", () => {
    expect(formatInvoiceNumber(1)).toBe("F-00001");
    expect(formatInvoiceNumber(143)).toBe("F-00143");
    expect(formatInvoiceNumber(123456)).toBe("F-123456");
  });

  it("uses the merchant's colour, else the theme's, else the default blue", () => {
    expect(resolveInvoiceColor("#047857", "#B4451F")).toBe("#047857");
    expect(resolveInvoiceColor("#abcdef")).toBe("#ABCDEF");
    // Pas de choix (absent, vide, invalide) : couleur du thème.
    expect(resolveInvoiceColor(undefined, "#B4451F")).toBe("#B4451F");
    expect(resolveInvoiceColor("", "#b4451f")).toBe("#B4451F");
    expect(resolveInvoiceColor("red", "#B4451F")).toBe("#B4451F");
    // Le bleu par défaut, enregistré pour tous avant les thèmes, suit le thème.
    expect(resolveInvoiceColor(DEFAULT_INVOICE_COLOR, "#B4451F")).toBe("#B4451F");
    expect(customInvoiceColor(DEFAULT_INVOICE_COLOR)).toBeNull();
    // Sans thème connu : bleu par défaut.
    expect(resolveInvoiceColor(undefined)).toBe(DEFAULT_INVOICE_COLOR);
  });

  it("offers presets that are real choices, never the follow-the-theme blue", () => {
    for (const preset of INVOICE_COLOR_PRESETS) {
      expect(customInvoiceColor(preset.value)).toBe(preset.value.toUpperCase());
    }
  });

  it("falls back to a 0 % rate on bad values", () => {
    expect(resolveVatRate(19.25)).toBe(19.25);
    expect(resolveVatRate(-1)).toBe(0);
    expect(resolveVatRate(150)).toBe(0);
    expect(resolveVatRate("19.25")).toBe(0);
    expect(resolveVatRate(undefined)).toBe(0);
  });

  it("derives HT and VAT from the TTC prices paid, totals from the amount paid", () => {
    const { lines, totals } = computeInvoice(
      [
        { name: "Robe", quantity: 1, unitPrice: 15000 },
        { name: "Sac", quantity: 2, unitPrice: 8000 },
      ],
      19.25,
      { discount: 1000, total: 30000 }
    );

    expect(lines[1].totalTtc).toBe(16000);
    expect(lines[1].unitPriceHt).toBeCloseTo(8000 / 1.1925, 6);
    expect(lines[1].totalVat).toBeCloseTo(16000 - 16000 / 1.1925, 6);
    expect(totals.subtotalTtc).toBe(31000);
    expect(totals.discount).toBe(1000);
    expect(totals.totalTtc).toBe(30000);
    expect(totals.totalHt + totals.totalVat).toBeCloseTo(30000, 6);
  });

  it("has no VAT when the shop isn't liable", () => {
    const { lines, totals } = computeInvoice([{ name: "Robe", quantity: 2, unitPrice: 5000 }], 0, {
      discount: 0,
      total: 10000,
    });
    expect(lines[0].unitPriceHt).toBe(5000);
    expect(lines[0].totalVat).toBe(0);
    expect(totals.totalHt).toBe(10000);
    expect(totals.totalVat).toBe(0);
  });

  it("formats amounts in the invoice currency, at its frozen rate, with plain spaces", () => {
    expect(formatInvoiceMoney(922500, "XAF", 1)).toBe("922 500 FCFA");
    expect(formatInvoiceMoney(655957, "EUR", 655.957)).toBe("1 000,00 €");
    expect(formatVatRate(19.25)).toBe("19,25 %");
  });

  it("keeps only characters the PDF fonts can draw", () => {
    expect(toPdfText("Pagne wax 🎉 « bamiléké » – 15 €")).toBe("Pagne wax « bamiléké » – 15 €");
    expect(toPdfText("Œuvre d’art")).toBe("Œuvre d’art");
    expect(toPdfText("中文 Tissu")).toBe("Tissu");
  });
});

import {
  EUR_TO_XAF,
  buildRates,
  DEFAULT_USD_TO_XAF,
  convertFromXaf,
  displayCurrency,
  formatMoney,
  shopCurrency,
} from "@/lib/currency";

const withUsd = buildRates(600);
// Taux du dollar absent (cas que `buildRates` n'émet plus, mais que
// `displayCurrency` sait toujours gérer).
const withoutUsd = { XAF: 1, EUR: EUR_TO_XAF, USD: undefined };
/** Espaces insécables d'Intl ramenées à des espaces simples. */
const plain = (text: string) => text.replace(/[  ]/g, " ");

describe("currency", () => {
  it("keeps FCFA amounts as they are, without decimals", () => {
    expect(plain(formatMoney(10000, "XAF", withUsd, "fr-FR"))).toBe("10 000 FCFA");
  });

  it("converts to euros with the official fixed parity", () => {
    expect(convertFromXaf(EUR_TO_XAF, "EUR", withoutUsd)).toBe(1);
    expect(plain(formatMoney(10000, "EUR", withoutUsd, "fr-FR"))).toBe("15,24 €");
  });

  it("converts to dollars with the rate set by the Super Admin", () => {
    expect(plain(formatMoney(6000, "USD", withUsd, "fr-FR"))).toBe("10,00 $US");
    expect(formatMoney(6000, "USD", withUsd, "en-US")).toBe("$10.00");
  });

  it("falls back to FCFA rather than showing a wrong amount when the dollar rate isn't set", () => {
    expect(displayCurrency("USD", withoutUsd)).toBe("XAF");
    expect(plain(formatMoney(6000, "USD", withoutUsd, "fr-FR"))).toBe("6 000 FCFA");
  });

  it("reads a shop's currency, FCFA when missing or unknown", () => {
    expect(shopCurrency({ currency: "EUR" })).toBe("EUR");
    expect(shopCurrency({ currency: "GBP" })).toBe("XAF");
    expect(shopCurrency(null)).toBe("XAF");
    // Aucun taux enregistré par le Super Admin : taux indicatif par défaut.
    expect(buildRates(0).USD).toBe(DEFAULT_USD_TO_XAF);
    expect(buildRates(undefined).USD).toBe(600);
    expect(buildRates(610).USD).toBe(610);
  });

  it("shows dollar prices at the default rate until the Super Admin sets one", () => {
    expect(displayCurrency("USD", buildRates(undefined))).toBe("USD");
    expect(plain(formatMoney(6000, "USD", buildRates(undefined), "en-US"))).toBe("$10.00");
  });
});

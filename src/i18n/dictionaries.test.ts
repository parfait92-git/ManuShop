import en from "@/i18n/dictionaries/en.json";
import fr from "@/i18n/dictionaries/fr.json";
import { translate } from "@/i18n/I18nProvider";

function keys(node: unknown, prefix = ""): string[] {
  return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) =>
    typeof value === "string" ? [`${prefix}${key}`] : keys(value, `${prefix}${key}.`)
  );
}

function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
}

describe("dictionnaires de langue", () => {
  it("every language has exactly the keys of the French reference", () => {
    expect(keys(en).sort()).toEqual(keys(fr).sort());
  });

  it("every translation keeps the same {placeholders} as French", () => {
    for (const key of keys(fr)) {
      const get = (dict: unknown) =>
        key.split(".").reduce<unknown>((n, p) => (n as Record<string, unknown>)[p], dict) as string;
      expect([key, placeholders(get(en))]).toEqual([key, placeholders(get(fr))]);
    }
  });

  it("fills placeholders, and leaves unknown keys visible rather than blank", () => {
    expect(translate(fr, "currency.clientPreview", { amount: "15,24 €" })).toBe(
      "Vos clients verront : 15,24 €"
    );
    expect(translate(fr, "nope.missing" as never)).toBe("nope.missing");
  });
});

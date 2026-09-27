import { Timestamp } from "firebase/firestore";

import { formatShopAge } from "./shopAge";

// `formatShopAge` lit les composants LOCAUX de la date (`getMonth()`,
// `getDate()`...) — les fixtures utilisent donc `new Date(année, mois, jour)`
// (heure locale), jamais une chaîne ISO suffixée "Z" (UTC), pour éviter tout
// décalage de jour selon le fuseau horaire de la machine qui exécute le test.
describe("formatShopAge", () => {
  const now = new Date(2026, 8, 27); // 27 septembre 2026

  it("returns 'moins d'un mois' for a shop created this month", () => {
    const createdAt = Timestamp.fromDate(new Date(2026, 8, 10));
    expect(formatShopAge(createdAt, now)).toBe("Depuis moins d'un mois");
  });

  it("returns the number of months for a shop under a year old", () => {
    const createdAt = Timestamp.fromDate(new Date(2026, 3, 27));
    expect(formatShopAge(createdAt, now)).toBe("Depuis 5 mois");
  });

  it("does not round up a partial month", () => {
    // Créée le 28, "aujourd'hui" le 27 : le mois n'est pas encore complet.
    const createdAt = Timestamp.fromDate(new Date(2026, 3, 28));
    expect(formatShopAge(createdAt, now)).toBe("Depuis 4 mois");
  });

  it("returns whole years without a remainder when exact", () => {
    const createdAt = Timestamp.fromDate(new Date(2024, 8, 20));
    expect(formatShopAge(createdAt, now)).toBe("Depuis 2 ans");
  });

  it("returns years and remaining months, singular year", () => {
    const createdAt = Timestamp.fromDate(new Date(2025, 5, 20));
    expect(formatShopAge(createdAt, now)).toBe("Depuis 1 an et 3 mois");
  });

  it("returns years and remaining months, plural years", () => {
    const createdAt = Timestamp.fromDate(new Date(2023, 4, 20));
    expect(formatShopAge(createdAt, now)).toBe("Depuis 3 ans et 4 mois");
  });
});

import { render, screen } from "@testing-library/react";

import { ComingSoonStrip } from "./ComingSoonStrip";
import {
  ABOUT_DESCRIPTION,
  ABOUT_VALUES,
  COMING_SOON,
  FEATURES,
  HERO_DESCRIPTION,
  HERO_EYEBROW,
  HERO_WATERMARK,
} from "./landingContent";

/** Fonctions pas encore construites : jamais présentées comme disponibles. */
const NOT_BUILT_YET = [
  // Les factures PDF existent (2026-10-03) ; leur envoi par WhatsApp
  // (BF-27) et les factures groupées par période (BF-104), pas encore.
  "factures par whatsapp",
  "factures envoyées",
  "factures groupées",
  "facturation automatique",
  "publication",
  "publiez",
  "réseaux sociaux",
  "mobile money",
  "paiement mobile",
  "code promo",
  "codes promo",
  "vente flash",
  "ventes flash",
  "variante",
  "hors-ligne",
  "hors ligne",
];

describe("page d'accueil", () => {
  it("only presents as available what ManuShop really does", () => {
    const presented = [
      HERO_EYEBROW,
      HERO_DESCRIPTION,
      HERO_WATERMARK,
      ABOUT_DESCRIPTION,
      ...ABOUT_VALUES.map((value) => value.text),
      ...FEATURES.flatMap((feature) => [feature.title, feature.description]),
    ]
      .join(" ")
      .toLowerCase();

    for (const term of NOT_BUILT_YET) {
      expect([term, presented.includes(term)]).toEqual([term, false]);
    }
  });

  it("announces the roadmap separately, as coming soon", () => {
    render(<ComingSoonStrip />);

    expect(screen.getByRole("heading", { name: "Bientôt sur ManuShop" })).toBeInTheDocument();
    for (const item of COMING_SOON) {
      expect(screen.getByText(item)).toBeInTheDocument();
    }
  });
});

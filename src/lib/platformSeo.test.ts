import {
  DIRECTORY_DESCRIPTION,
  DIRECTORY_TITLE,
  MARKET_DESCRIPTION,
  MARKET_TITLE,
  PLATFORM_DESCRIPTION,
  PLATFORM_KEYWORDS,
  PLATFORM_TITLE,
  REGISTER_DESCRIPTION,
  REGISTER_TITLE,
  platformJsonLd,
} from "./platformSeo";

/** Suffixe ajouté par le modèle de titre de la mise en page racine. */
const SUFFIX = " | ManuShop";

describe("référencement de la plateforme", () => {
  it("keeps titles under 60 characters, suffix included, so Google doesn't cut them", () => {
    expect(PLATFORM_TITLE.length).toBeLessThanOrEqual(60);
    for (const title of [MARKET_TITLE, DIRECTORY_TITLE, REGISTER_TITLE]) {
      expect((title + SUFFIX).length).toBeLessThanOrEqual(60);
    }
  });

  it("keeps descriptions under 160 characters", () => {
    for (const description of [
      PLATFORM_DESCRIPTION,
      MARKET_DESCRIPTION,
      DIRECTORY_DESCRIPTION,
      REGISTER_DESCRIPTION,
    ]) {
      expect(description.length).toBeLessThanOrEqual(160);
    }
  });

  it("never promises features that aren't built yet (invoicing, Mobile Money, social posting)", () => {
    const everything = [
      PLATFORM_TITLE,
      PLATFORM_DESCRIPTION,
      ...PLATFORM_KEYWORDS,
      MARKET_DESCRIPTION,
      DIRECTORY_DESCRIPTION,
      REGISTER_DESCRIPTION,
    ]
      .join(" ")
      .toLowerCase();
    for (const notYet of ["factur", "mobile money", "orange money", "tiktok", "instagram", "facebook"]) {
      expect(everything).not.toContain(notYet);
    }
  });

  it("targets merchants looking to sell online in Cameroon", () => {
    expect(PLATFORM_KEYWORDS).toEqual(
      expect.arrayContaining(["boutique en ligne Cameroun", "vendre sur WhatsApp", "gestion de stock"])
    );
  });

  it("declares the organisation, the site and its product search to Google", () => {
    const graph = platformJsonLd("https://manushop.cm")["@graph"] as Record<string, unknown>[];
    expect(graph.map((node) => node["@type"])).toEqual(["Organization", "WebSite"]);
    expect(graph[1]).toMatchObject({
      potentialAction: {
        "@type": "SearchAction",
        target: { urlTemplate: "https://manushop.cm/catalogue?q={search_term_string}" },
      },
    });
  });
});

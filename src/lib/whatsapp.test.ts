import { buildWhatsAppOrderLink } from "./whatsapp";

describe("buildWhatsAppOrderLink", () => {
  const shop = { name: "Ada Boutique", whatsapp: "+237 6 00 00 00 00" };
  const items = [
    { productId: "p1", name: "Sandales", price: 9500, image: "", quantity: 2 },
    { productId: "p2", name: "Sac", price: 12000, image: "", quantity: 1 },
  ];

  it("strips non-digit characters from the phone number", () => {
    const link = buildWhatsAppOrderLink(shop, items);
    expect(link.startsWith("https://wa.me/237600000000?text=")).toBe(true);
  });

  it("includes the shop name, each item, and the total in the message", () => {
    const link = buildWhatsAppOrderLink(shop, items);
    const message = decodeURIComponent(link.split("?text=")[1]);

    expect(message).toContain("Ada Boutique");
    expect(message).toContain("Sandales x2");
    expect(message).toContain("Sac x1");
    // fr-FR groups thousands with a narrow no-break space, not a plain " ".
    expect(message).toContain(`Total : ${(31000).toLocaleString("fr-FR")} FCFA`);
  });
});

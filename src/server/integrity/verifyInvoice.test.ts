jest.mock("firebase-admin/firestore", () => ({ Timestamp: {} }));

import { generateKeyPairSync } from "crypto";

import { invoiceSignedText } from "@/server/invoices/issueInvoice";
import { nextHistoryEvent, type HistoryEvent } from "./orderHistory";
import { resetSigningKeysForTests, signText } from "./signing";
import { clientInitials, verifyInvoiceByCode } from "./verifyInvoice";

const at = (iso: string) => ({ toDate: () => new Date(iso) });

beforeEach(() => {
  process.env.INVOICE_SIGNING_KEY = generateKeyPairSync("ed25519")
    .privateKey.export({ type: "pkcs8", format: "der" })
    .toString("base64");
  resetSigningKeysForTests();
});

function signedInvoice(overrides: Record<string, unknown> = {}) {
  const invoice = {
    orderId: "o1",
    shopId: "shop-1",
    number: "F-00012",
    sequence: 12,
    issuedAtMs: Date.parse("2026-10-03T11:00:00Z"),
    verificationCode: "7K4PQ9X2MB",
    seller: { name: "Chez Awa", address: "Douala", phone: "+237690000000" },
    client: { name: "Fatou Ba", phone: "+237690000001", address: "Bastos, Yaoundé" },
    items: [{ name: "Robe", quantity: 2, unitPrice: 15000 }],
    discount: 0,
    total: 30000,
    vatRate: 0,
    currency: "XAF",
    rateToXaf: 1,
    color: "#3B5BA5",
    ...overrides,
  };
  return { ...invoice, ...signText(invoiceSignedText(invoice))! };
}

function history(statuses: string[]) {
  const events: HistoryEvent[] = [];
  let head = {};
  statuses.forEach((status, i) => {
    const fact = status.startsWith("F-")
      ? ({ type: "invoice", number: status } as const)
      : ({ type: "status", status } as never);
    const event = nextHistoryEvent("o1", head, fact, new Date(Date.UTC(2026, 9, 3, 8 + i)));
    events.push(event);
    head = { historySeq: event.seq, historyHash: event.hash };
  });
  return { events, head };
}

function fakeDb(invoice: Record<string, unknown> | null, order: Record<string, unknown>, events: HistoryEvent[]) {
  const orderRef = {
    get: async () => ({ exists: true, data: () => order }),
    collection: () => ({ get: async () => ({ docs: events.map((e) => ({ data: () => e })) }) }),
  };
  return {
    collection: (name: string) =>
      name === "invoices"
        ? {
            where: () => ({
              limit: () => ({
                get: async () =>
                  invoice
                    ? { empty: false, docs: [{ id: "o1", data: () => invoice }] }
                    : { empty: true, docs: [] },
              }),
            }),
          }
        : { doc: () => orderRef },
  } as never;
}

const ORDER = {
  shopId: "shop-1",
  total: 30000,
  status: "delivered",
  createdAt: at("2026-10-03T08:00:00Z"),
  updatedAt: at("2026-10-03T10:00:00Z"),
};

describe("verifyInvoiceByCode", () => {
  it("certifies a signed invoice with an intact history, without exposing the client", async () => {
    const { events, head } = history(["under_review", "delivering", "delivered", "F-00012"]);
    const result = await verifyInvoiceByCode(
      fakeDb(signedInvoice(), { ...ORDER, ...head }, events),
      "7K4PQ9X2MB"
    );

    expect(result).toEqual(
      expect.objectContaining({
        state: "authentic",
        code: "MS-7K4PQ-9X2MB",
        number: "F-00012",
        clientInitials: "F. B.",
        total: "30 000 FCFA",
        partialHistory: false,
      })
    );
    expect(result!.timeline.map((s) => s.label)).toEqual([
      "Commande reçue par la boutique",
      "Commande en cours de livraison",
      "Commande livrée",
      "Facture F-00012 émise",
    ]);
    expect(result!.timeline.every((s) => s.signed)).toBe(true);
    // Rien de personnel sur la page publique.
    const shown = JSON.stringify(result);
    expect(shown).not.toContain("Fatou");
    expect(shown).not.toContain("+237690000001");
    expect(shown).not.toContain("Bastos");
  });

  it("flags an invoice whose content was altered after signing", async () => {
    const { events, head } = history(["under_review", "delivered", "F-00012"]);
    const forged = { ...signedInvoice(), total: 3000 };
    const result = await verifyInvoiceByCode(fakeDb(forged, { ...ORDER, ...head, total: 3000 }, events), "7K4PQ9X2MB");
    expect(result!.state).toBe("tampered");
  });

  it("flags a history with a missing step", async () => {
    const { events, head } = history(["under_review", "delivered", "F-00012"]);
    const result = await verifyInvoiceByCode(
      fakeDb(signedInvoice(), { ...ORDER, ...head }, events.slice(0, 2)),
      "7K4PQ9X2MB"
    );
    expect(result!.state).toBe("tampered");
  });

  it("shows a returned order as such in the timeline", async () => {
    const { events, head } = history(["under_review", "delivered", "F-00012", "returned"]);
    const result = await verifyInvoiceByCode(
      fakeDb(signedInvoice(), { ...ORDER, ...head, status: "returned" }, events),
      "7K4PQ9X2MB"
    );
    expect(result!.state).toBe("authentic");
    expect(result!.timeline.at(-1)).toEqual(
      expect.objectContaining({ label: "Commande retournée", warning: true })
    );
  });

  it("reconstructs the timeline of an older order, marked unsigned", async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { signature, keyId, ...unsigned } = signedInvoice();
    const result = await verifyInvoiceByCode(fakeDb(unsigned, ORDER, []), "7K4PQ9X2MB");

    expect(result!.state).toBe("unsigned");
    expect(result!.partialHistory).toBe(true);
    expect(result!.timeline.map((s) => [s.label, s.signed])).toEqual([
      ["Commande reçue par la boutique", false],
      ["Commande livrée", false],
      ["Facture F-00012 émise", false],
    ]);
  });

  it("returns nothing for an unknown code", async () => {
    expect(await verifyInvoiceByCode(fakeDb(null, ORDER, []), "0000000000")).toBeNull();
  });

  it("abbreviates the client's name", () => {
    expect(clientInitials("Fatou Ba")).toBe("F. B.");
    expect(clientInitials("awa")).toBe("A.");
    expect(clientInitials("  ")).toBe("Client");
  });
});

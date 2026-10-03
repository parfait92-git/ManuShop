const ISSUED_MS = Date.parse("2026-10-03T10:00:00Z");
jest.mock("firebase-admin/firestore", () => ({
  Timestamp: {
    now: () => ({ toMillis: () => ISSUED_MS, toDate: () => new Date(ISSUED_MS) }),
  },
}));

import { generateKeyPairSync } from "crypto";

import { ensureInvoice, invoiceSignedText } from "@/server/invoices/issueInvoice";
import { NotFoundError, ValidationError } from "@/server/errors";
import { checkSignature, resetSigningKeysForTests } from "@/server/integrity/signing";

const TEST_KEY = generateKeyPairSync("ed25519")
  .privateKey.export({ type: "pkcs8", format: "der" })
  .toString("base64");

beforeEach(() => {
  process.env.INVOICE_SIGNING_KEY = TEST_KEY;
  resetSigningKeysForTests();
});

/** Firestore en mémoire, juste ce qu'utilise `ensureInvoice`. */
function fakeDb(docs: Record<string, Record<string, unknown> | undefined>) {
  const writes: Record<string, Record<string, unknown>> = {};
  const ref = (path: string): { path: string; collection: (name: string) => unknown } => ({
    path,
    collection: (name: string) => ({ doc: (id: string) => ref(`${path}/${name}/${id}`) }),
  });
  const write = ({ path }: { path: string }, data: Record<string, unknown>) => {
    writes[path] = { ...(writes[path] ?? {}), ...data };
  };
  const db = {
    collection: (name: string) => ({ doc: (id: string) => ref(`${name}/${id}`) }),
    runTransaction: async (fn: (t: unknown) => Promise<unknown>) =>
      fn({
        get: async (target: { path: string }) => ({
          exists: docs[target.path] !== undefined,
          data: () => docs[target.path],
          ref: target,
        }),
        set: write,
        create: write,
        update: write,
      }),
  };
  return { db: db as never, writes };
}

const ORDER = {
  shopId: "shop-1",
  clientId: "client-1",
  clientName: "Fatou Ba",
  clientPhone: "+237690000001",
  clientAddress: "Yaoundé",
  items: [{ productId: "p1", name: "Robe", quantity: 2, unitPrice: 15000 }],
  subtotal: 30000,
  discount: 0,
  total: 30000,
  status: "delivered",
};

const SHOP = {
  name: "Chez Awa",
  address: "Douala",
  phone: "+237690000000",
  logo: "https://res.cloudinary.com/x/image/upload/logo.webp",
  publicContactEmail: "contact@chezawa.cm",
  currency: "EUR",
  themeColor: "#047857",
  vatRate: 19.25,
  taxId: "M0123",
  tradeRegister: " ",
};

describe("ensureInvoice", () => {
  it("issues the next number of the shop and freezes seller, client, VAT, currency and colour", async () => {
    const { db, writes } = fakeDb({
      "orders/o1": ORDER,
      "shops/shop-1": SHOP,
      "invoiceCounters/shop-1": { last: 11 },
      "configuration/general": {},
    });

    const invoice = await ensureInvoice(db, "o1");

    expect(writes["invoiceCounters/shop-1"]).toEqual({ last: 12 });
    expect(writes["invoices/o1"]).toEqual(
      expect.objectContaining({
        orderId: "o1",
        shopId: "shop-1",
        clientId: "client-1",
        sequence: 12,
        number: "F-00012",
        issuedAtMs: ISSUED_MS,
        verificationCode: expect.stringMatching(/^[0-9A-HJKMNP-TV-Z]{10}$/),
        seller: {
          name: "Chez Awa",
          address: "Douala",
          phone: "+237690000000",
          email: "contact@chezawa.cm",
          logo: SHOP.logo,
          taxId: "M0123",
        },
        client: { name: "Fatou Ba", phone: "+237690000001", address: "Yaoundé" },
        items: [{ name: "Robe", quantity: 2, unitPrice: 15000 }],
        total: 30000,
        vatRate: 19.25,
        currency: "EUR",
        rateToXaf: 655.957,
        color: "#047857",
      })
    );
    expect(invoice.number).toBe("F-00012");
    // Signée : la signature couvre tout le contenu de la facture.
    expect(checkSignature(invoiceSignedText(invoice), invoice)).toBe("valid");
    expect(checkSignature(invoiceSignedText({ ...invoice, total: 3000 }), invoice)).toBe("invalid");
    // L'émission entre dans l'historique signé de la commande.
    expect(writes["orders/o1/history/000001"]).toEqual(
      expect.objectContaining({ seq: 1, fact: { type: "invoice", number: "F-00012" } })
    );
    expect(writes["orders/o1"]).toEqual(expect.objectContaining({ historySeq: 1 }));
  });

  it("seals an invoice issued before the digital signature, keeping its number and content", async () => {
    const legacy = {
      number: "F-00003",
      sequence: 3,
      total: 30000,
      issuedAt: { toMillis: () => ISSUED_MS - 1000 },
    };
    const { db, writes } = fakeDb({ "invoices/o1": legacy, "orders/o1": ORDER });

    const sealed = await ensureInvoice(db, "o1");

    expect(sealed.number).toBe("F-00003");
    expect(sealed.verificationCode).toMatch(/^[0-9A-Z]{10}$/);
    expect(sealed.issuedAtMs).toBe(ISSUED_MS - 1000);
    expect(checkSignature(invoiceSignedText(sealed), sealed)).toBe("valid");
    expect(writes["invoices/o1"]).toEqual(
      expect.objectContaining({ verificationCode: sealed.verificationCode, signature: sealed.signature })
    );
    expect(writes["invoices/o1"]).not.toHaveProperty("issuedAt");
  });

  it("still issues the invoice, unsigned, when no signing key is configured", async () => {
    delete process.env.INVOICE_SIGNING_KEY;
    resetSigningKeysForTests();
    jest.spyOn(console, "error").mockImplementation(() => {});
    const { db } = fakeDb({
      "orders/o1": ORDER,
      "shops/shop-1": SHOP,
      "configuration/general": {},
    });

    const invoice = await ensureInvoice(db, "o1");

    expect(invoice.verificationCode).toBeDefined();
    expect(invoice.signature).toBeUndefined();
  });

  it("starts at 1, with the default dollar rate, colour and no VAT when unset", async () => {
    const { db, writes } = fakeDb({
      "orders/o1": ORDER,
      "shops/shop-1": { name: "Chez Awa", currency: "USD" },
      "configuration/general": {},
    });

    await ensureInvoice(db, "o1");

    expect(writes["invoices/o1"]).toEqual(
      expect.objectContaining({
        number: "F-00001",
        vatRate: 0,
        // Taux du dollar pas encore saisi : taux indicatif par défaut.
        currency: "USD",
        rateToXaf: 600,
        color: "#3B5BA5",
      })
    );
  });

  // Le thème choisi s'applique aussi à la facture (2026-10-03).
  it("takes the colour of the shop's theme when the merchant hasn't chosen one", async () => {
    const { db, writes } = fakeDb({
      "orders/o1": ORDER,
      "shops/shop-1": { ...SHOP, themeColor: "" },
      "shops/shop-1/themes/active": { themeId: "wax-soleil" },
      "configuration/general": {},
    });
    await ensureInvoice(db, "o1");
    expect(writes["invoices/o1"]).toEqual(expect.objectContaining({ color: "#B4451F" }));
  });

  it("keeps the merchant's own colour over the theme's", async () => {
    const { db, writes } = fakeDb({
      "orders/o1": ORDER,
      "shops/shop-1": SHOP,
      "shops/shop-1/themes/active": { themeId: "wax-soleil" },
      "configuration/general": {},
    });
    await ensureInvoice(db, "o1");
    expect(writes["invoices/o1"]).toEqual(expect.objectContaining({ color: "#047857" }));
  });

  it("returns an invoice already issued as is, without renumbering", async () => {
    const existing = { number: "F-00003", sequence: 3, verificationCode: "7K4PQ9X2MB", signature: "sig", keyId: "k" };
    const { db, writes } = fakeDb({ "invoices/o1": existing, "orders/o1": ORDER });

    expect(await ensureInvoice(db, "o1")).toBe(existing);
    expect(writes).toEqual({});
  });

  it("refuses an order that hasn't been delivered, or doesn't exist", async () => {
    const { db } = fakeDb({ "orders/o1": { ...ORDER, status: "delivering" } });
    await expect(ensureInvoice(db, "o1")).rejects.toThrow(ValidationError);
    await expect(ensureInvoice(db, "missing")).rejects.toThrow(NotFoundError);
  });

  it("keeps the invoice of a delivered order later returned", async () => {
    const { db, writes } = fakeDb({
      "orders/o1": { ...ORDER, status: "returned" },
      "shops/shop-1": SHOP,
      "configuration/general": {},
    });
    await ensureInvoice(db, "o1");
    expect(writes["invoices/o1"]).toBeDefined();
  });
});

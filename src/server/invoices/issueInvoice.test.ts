jest.mock("firebase-admin/firestore", () => ({
  FieldValue: { serverTimestamp: () => ({ __op: "serverTimestamp" }) },
}));

import { ensureInvoice } from "@/server/invoices/issueInvoice";
import { NotFoundError, ValidationError } from "@/server/errors";

/** Firestore en mémoire, juste ce qu'utilise `ensureInvoice`. */
function fakeDb(docs: Record<string, Record<string, unknown> | undefined>) {
  const writes: Record<string, unknown> = {};
  const ref = (path: string) => ({ path });
  const db = {
    collection: (name: string) => ({ doc: (id: string) => ref(`${name}/${id}`) }),
    runTransaction: async (fn: (t: unknown) => Promise<unknown>) =>
      fn({
        get: async ({ path }: { path: string }) => ({
          exists: docs[path] !== undefined,
          data: () => docs[path],
        }),
        set: ({ path }: { path: string }, data: unknown) => {
          writes[path] = data;
        },
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
        issuedAt: { __op: "serverTimestamp" },
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
    expect(invoice.issuedAt).toBeInstanceOf(Date);
  });

  it("starts at 1, and stays in FCFA with the default colour and no VAT when unset", async () => {
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
        // Taux du dollar pas encore saisi : FCFA plutôt qu'un montant faux.
        currency: "XAF",
        rateToXaf: 1,
        color: "#3B5BA5",
      })
    );
  });

  it("returns an invoice already issued as is, without renumbering", async () => {
    const existing = { number: "F-00003", sequence: 3 };
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

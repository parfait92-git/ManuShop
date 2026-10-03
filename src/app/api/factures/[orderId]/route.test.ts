/** @jest-environment node */
const verifyIdTokenMock = jest.fn();
jest.mock("../../../../lib/verifyIdToken", () => ({
  verifyIdToken: (...args: unknown[]) => verifyIdTokenMock(...args),
}));

const orderGetMock = jest.fn();
const userGetMock = jest.fn();
const shopGetMock = jest.fn().mockResolvedValue({ data: () => undefined });
const themeGetMock = jest.fn().mockResolvedValue({ data: () => undefined });
jest.mock("../../../../lib/firebaseAdmin", () => ({
  getAdminDb: () => ({
    collection: (name: string) => ({
      doc: () => ({
        get: name === "orders" ? orderGetMock : name === "shops" ? shopGetMock : userGetMock,
        collection: () => ({ doc: () => ({ get: themeGetMock }) }),
      }),
    }),
  }),
}));

const ensureInvoiceMock = jest.fn();
jest.mock("../../../../server/invoices/issueInvoice", () => ({
  ensureInvoice: (...args: unknown[]) => ensureInvoiceMock(...args),
  isInvoicedStatus: (status: string) => ["delivered", "returned", "defective"].includes(status),
}));

jest.mock("../../../../server/invoices/InvoiceDocument", () => ({ InvoiceDocument: () => null }));
jest.mock("../../../../server/invoices/loadInvoiceLogo", () => ({
  loadInvoiceLogo: jest.fn().mockResolvedValue(null),
}));

jest.mock("../../../../server/seo/publicData", () => ({
  getPublicSiteUrl: () => Promise.resolve("https://www.manushop.cm"),
}));

const qrToBufferMock = jest.fn().mockResolvedValue(Buffer.from("png"));
jest.mock("qrcode", () => ({ toBuffer: (...args: unknown[]) => qrToBufferMock(...args) }));

const renderToBufferMock = jest.fn();
jest.mock("@react-pdf/renderer", () => ({
  renderToBuffer: (...args: unknown[]) => renderToBufferMock(...args),
}));

import { GET } from "./route";

const params = { params: Promise.resolve({ orderId: "o1" }) };
const request = () => new Request("http://localhost/api/factures/o1", { headers: { authorization: "Bearer t" } });

function mockOrder(overrides: Record<string, unknown> = {}) {
  orderGetMock.mockResolvedValue({
    exists: true,
    data: () => ({ shopId: "shop-1", clientId: "client-1", status: "delivered", ...overrides }),
  });
}

const INVOICE = {
  number: "F-00012",
  issuedAt: new Date("2026-10-03T10:00:00Z"),
  seller: { name: "Chez Awa", address: "", phone: "" },
  client: { name: "Fatou", address: "", phone: "" },
  items: [],
  discount: 0,
  total: 0,
  vatRate: 0,
  currency: "XAF",
  rateToXaf: 1,
  color: "#3B5BA5",
};

describe("GET /api/factures/[orderId]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    verifyIdTokenMock.mockResolvedValue({ uid: "client-1" });
    ensureInvoiceMock.mockResolvedValue(INVOICE);
    renderToBufferMock.mockResolvedValue(Buffer.from("%PDF-1.4"));
  });

  it("requires a signed-in caller", async () => {
    verifyIdTokenMock.mockResolvedValue(null);
    expect((await GET(request(), params)).status).toBe(401);
  });

  it("sends the order's client their invoice as a PDF attachment", async () => {
    mockOrder();
    const response = await GET(request(), params);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="facture-F-00012.pdf"');
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(ensureInvoiceMock).toHaveBeenCalledWith(expect.anything(), "o1");
  });

  it("prints a QR code leading to the verification page, on the official domain", async () => {
    mockOrder();
    ensureInvoiceMock.mockResolvedValue({ ...INVOICE, shopId: "shop-1", verificationCode: "7K4PQ9X2MB" });

    await GET(request(), params);

    expect(qrToBufferMock.mock.calls[0][0]).toBe(
      "https://www.manushop.cm/boutique/shop-1/verifier/7K4PQ9X2MB"
    );
    const element = renderToBufferMock.mock.calls[0][0];
    expect(element.props.verification).toEqual({
      qr: Buffer.from("png"),
      code: "MS-7K4PQ-9X2MB",
      host: "www.manushop.cm",
    });
  });

  it("prints the issue date in the reader's time zone, Cameroon by default", async () => {
    mockOrder();
    await GET(
      new Request("http://localhost/api/factures/o1?tz=Europe%2FParis", { headers: { authorization: "Bearer t" } }),
      params
    );
    expect(renderToBufferMock.mock.calls[0][0].props.invoice.timeZone).toBe("Europe/Paris");

    mockOrder();
    await GET(
      new Request("http://localhost/api/factures/o1?tz=Pas%2FUnFuseau", { headers: { authorization: "Bearer t" } }),
      params
    );
    expect(renderToBufferMock.mock.calls[1][0].props.invoice.timeZone).toBe("Africa/Douala");
  });

  it("lets a seller of the order's shop download it", async () => {
    mockOrder();
    verifyIdTokenMock.mockResolvedValue({ uid: "seller-1" });
    userGetMock.mockResolvedValue({ data: () => ({ role: "seller", shopId: "shop-1" }) });
    expect((await GET(request(), params)).status).toBe(200);
  });

  it("hides the order from anyone else, as if it didn't exist", async () => {
    mockOrder();
    verifyIdTokenMock.mockResolvedValue({ uid: "stranger" });
    userGetMock.mockResolvedValue({ data: () => ({ role: "admin", shopId: "shop-2" }) });

    const response = await GET(request(), params);
    expect(response.status).toBe(404);
    expect(ensureInvoiceMock).not.toHaveBeenCalled();
  });

  it("refuses an order not delivered yet", async () => {
    mockOrder({ status: "delivering" });
    const response = await GET(request(), params);
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "La facture est disponible une fois la commande livrée.",
    });
  });

  // Couleur au moment du téléchargement (2026-10-03).
  it("draws the invoice in the colour of the shop's current theme", async () => {
    mockOrder();
    ensureInvoiceMock.mockResolvedValue({ ...INVOICE, shopId: "shop-1", color: "#3B5BA5" });
    shopGetMock.mockResolvedValueOnce({ data: () => ({ themeColor: "" }) });
    themeGetMock.mockResolvedValueOnce({ data: () => ({ themeId: "wax-soleil" }) });

    await GET(request(), params);

    expect(renderToBufferMock.mock.calls[0][0].props.invoice.color).toBe("#B4451F");
  });

  it("keeps the merchant's own invoice colour", async () => {
    mockOrder();
    ensureInvoiceMock.mockResolvedValue({ ...INVOICE, shopId: "shop-1" });
    shopGetMock.mockResolvedValueOnce({ data: () => ({ themeColor: "#047857" }) });
    themeGetMock.mockResolvedValueOnce({ data: () => ({ themeId: "wax-soleil" }) });

    await GET(request(), params);

    expect(renderToBufferMock.mock.calls[0][0].props.invoice.color).toBe("#047857");
  });
});

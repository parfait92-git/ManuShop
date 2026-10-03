jest.mock("../lib/firebase", () => ({
  auth: { currentUser: { getIdToken: jest.fn().mockResolvedValue("token-1") } },
}));

import { hasInvoice, InvoiceService } from "@/services/InvoiceService";

describe("InvoiceService", () => {
  const fetchMock = jest.fn();
  let clicked: HTMLAnchorElement | null;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock as never;
    URL.createObjectURL = jest.fn(() => "blob:facture");
    URL.revokeObjectURL = jest.fn();
    clicked = null;
    // Le lien de téléchargement est capturé au lieu d'être inséré et
    // cliqué (jsdom ne sait pas télécharger).
    jest.spyOn(document.body, "appendChild").mockImplementation((node) => {
      if (node instanceof HTMLAnchorElement) {
        clicked = node;
        node.click = () => {};
        node.remove = () => {};
      }
      return node;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("knows which orders have an invoice", () => {
    expect(hasInvoice("delivered")).toBe(true);
    expect(hasInvoice("returned")).toBe(true);
    expect(hasInvoice("defective")).toBe(true);
    expect(hasInvoice("delivering")).toBe(false);
    expect(hasInvoice("cancelled")).toBe(false);
  });

  it("downloads the PDF with the caller's token, under the server's file name", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-disposition": 'attachment; filename="facture-F-00012.pdf"' }),
      blob: async () => new Blob(["%PDF"]),
    });

    await new InvoiceService().download("o1");

    expect(fetchMock).toHaveBeenCalledWith("/api/factures/o1?tz=Africa%2FDouala", {
      headers: { Authorization: "Bearer token-1" },
    });
    expect(clicked?.download).toBe("facture-F-00012.pdf");
    expect(clicked?.href).toBe("blob:facture");
  });

  it("surfaces the server's error message", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "La facture est disponible une fois la commande livrée." }),
    });
    await expect(new InvoiceService().download("o1")).rejects.toThrow(
      "La facture est disponible une fois la commande livrée."
    );
    expect(clicked).toBeNull();
  });
});

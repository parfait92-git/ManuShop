import { sendOrderNotification } from "./whatsappBusiness";

const ORIGINAL_ENV = process.env;

describe("sendOrderNotification", () => {
  let fetchMock: jest.Mock;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as unknown as typeof fetch;
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  const input = {
    shopWhatsapp: "+237 6 00 00 00 01",
    orderId: "order-1",
    clientName: "Fatou Ba",
    total: 31000,
  };

  it("does nothing and logs a warning when the Meta credentials are missing", async () => {
    delete process.env.WHATSAPP_API_TOKEN;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;

    await sendOrderNotification(input);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
  });

  it("posts a template message to the Graph API with the shop's sanitized number", async () => {
    process.env.WHATSAPP_API_TOKEN = "token-123";
    process.env.WHATSAPP_PHONE_NUMBER_ID = "phone-id-456";

    await sendOrderNotification(input);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://graph.facebook.com/v21.0/phone-id-456/messages",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer token-123" }),
      })
    );

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toMatchObject({
      messaging_product: "whatsapp",
      to: "237600000001",
      type: "template",
      template: {
        name: "new_order_notification",
        language: { code: "fr" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: "Fatou Ba" },
              { type: "text", text: "order-1" },
              { type: "text", text: (31000).toLocaleString("fr-FR") + " FCFA" },
            ],
          },
        ],
      },
    });
  });

  it("uses a custom template name when WHATSAPP_ORDER_TEMPLATE_NAME is set", async () => {
    process.env.WHATSAPP_API_TOKEN = "token-123";
    process.env.WHATSAPP_PHONE_NUMBER_ID = "phone-id-456";
    process.env.WHATSAPP_ORDER_TEMPLATE_NAME = "custom_template";

    await sendOrderNotification(input);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.template.name).toBe("custom_template");
  });

  it("logs an error but does not throw when the Graph API responds with an error", async () => {
    process.env.WHATSAPP_API_TOKEN = "token-123";
    process.env.WHATSAPP_PHONE_NUMBER_ID = "phone-id-456";
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "invalid token",
    });

    await expect(sendOrderNotification(input)).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("logs an error but does not throw when the network call rejects", async () => {
    process.env.WHATSAPP_API_TOKEN = "token-123";
    process.env.WHATSAPP_PHONE_NUMBER_ID = "phone-id-456";
    fetchMock.mockRejectedValue(new Error("network down"));

    await expect(sendOrderNotification(input)).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("skips the call and warns when the shop has no valid WhatsApp number", async () => {
    process.env.WHATSAPP_API_TOKEN = "token-123";
    process.env.WHATSAPP_PHONE_NUMBER_ID = "phone-id-456";

    await sendOrderNotification({ ...input, shopWhatsapp: "" });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
  });
});

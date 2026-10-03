/** @jest-environment node */
import { loadInvoiceLogo } from "./loadInvoiceLogo";

const fetchMock = jest.fn();

function image(type: string, bytes = 10) {
  return {
    ok: true,
    headers: new Headers({ "content-type": type }),
    arrayBuffer: async () => new ArrayBuffer(bytes),
  };
}

describe("loadInvoiceLogo", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as never;
  });

  it("asks Cloudinary for a PNG the PDF can read", async () => {
    fetchMock.mockResolvedValue(image("image/png"));
    const logo = await loadInvoiceLogo("https://res.cloudinary.com/demo/image/upload/v1/shops/logo.webp");

    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_png,w_256,h_256,c_limit/v1/shops/logo.webp"
    );
    expect(logo?.format).toBe("png");
  });

  it("accepts a JPEG from another host as is", async () => {
    fetchMock.mockResolvedValue(image("image/jpeg"));
    const logo = await loadInvoiceLogo("https://example.com/logo.jpg");
    expect(fetchMock.mock.calls[0][0]).toBe("https://example.com/logo.jpg");
    expect(logo?.format).toBe("jpg");
  });

  it("gives up (initial instead) on a missing, unreadable or unreachable logo", async () => {
    expect(await loadInvoiceLogo(undefined)).toBeNull();
    expect(await loadInvoiceLogo("http://insecure.example/logo.png")).toBeNull();
    fetchMock.mockResolvedValueOnce(image("image/webp"));
    expect(await loadInvoiceLogo("https://example.com/logo.webp")).toBeNull();
    fetchMock.mockResolvedValueOnce(image("image/png", 3 * 1024 * 1024));
    expect(await loadInvoiceLogo("https://example.com/huge.png")).toBeNull();
    fetchMock.mockRejectedValueOnce(new Error("timeout"));
    expect(await loadInvoiceLogo("https://example.com/logo.png")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

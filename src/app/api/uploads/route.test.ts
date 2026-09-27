/**
 * @jest-environment node
 */
// Route Handler : a besoin de `Request`/`FormData`/`File` du standard web,
// absents de jsdom (l'environnement par défaut du projet) — voir le
// commentaire équivalent sur `AuthService.test.ts`/`ProductService.test.ts`
// pour `fetch`.

const verifyIdTokenMock = jest.fn();
jest.mock("../../../lib/verifyIdToken", () => ({
  verifyIdToken: (...args: unknown[]) => verifyIdTokenMock(...args),
}));

const uploadStreamMock = jest.fn();
jest.mock("../../../lib/cloudinary", () => ({
  getCloudinary: async () => ({
    uploader: {
      upload_stream: (...args: unknown[]) => uploadStreamMock(...args),
    },
  }),
}));

import { POST } from "./route";

function buildRequest(formData: FormData, authHeader: string | null = "Bearer token") {
  return new Request("http://localhost/api/uploads", {
    method: "POST",
    headers: authHeader ? { Authorization: authHeader } : undefined,
    body: formData,
  });
}

describe("POST /api/uploads", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    verifyIdTokenMock.mockResolvedValue({ uid: "u1" });
  });

  it("rejects an unauthenticated request", async () => {
    verifyIdTokenMock.mockResolvedValue(null);
    const response = await POST(buildRequest(new FormData(), null));

    expect(response.status).toBe(401);
  });

  it("rejects a request with no file", async () => {
    const response = await POST(buildRequest(new FormData()));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/Aucun fichier/);
  });

  it("rejects an unsupported file type", async () => {
    const formData = new FormData();
    formData.append("file", new File(["x"], "a.gif", { type: "image/gif" }));
    const response = await POST(buildRequest(formData));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/Format d'image/);
  });

  it("rejects a file over the 5MB size limit", async () => {
    const formData = new FormData();
    const big = new Uint8Array(5 * 1024 * 1024 + 1);
    formData.append("file", new File([big], "a.jpg", { type: "image/jpeg" }));
    const response = await POST(buildRequest(formData));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/taille maximale/);
  });

  it("uploads to Cloudinary and returns the secure url", async () => {
    uploadStreamMock.mockImplementation(
      (_opts: unknown, callback: (error: unknown, result: unknown) => void) => {
        callback(null, { secure_url: "https://res.cloudinary.com/x.jpg" });
        return { end: jest.fn() };
      }
    );

    const formData = new FormData();
    formData.append("file", new File(["x"], "a.jpg", { type: "image/jpeg" }));
    const response = await POST(buildRequest(formData));

    expect(response.status).toBe(200);
    expect((await response.json()).url).toBe("https://res.cloudinary.com/x.jpg");
  });

  it("returns a JSON 502 (not an uncaught crash) when Cloudinary itself fails", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    uploadStreamMock.mockImplementation(
      (_opts: unknown, callback: (error: unknown, result: unknown) => void) => {
        callback(new Error("Invalid signature"), null);
        return { end: jest.fn() };
      }
    );

    const formData = new FormData();
    formData.append("file", new File(["x"], "a.jpg", { type: "image/jpeg" }));
    const response = await POST(buildRequest(formData));

    expect(response.status).toBe(502);
    expect((await response.json()).error).toBe(
      "Échec de l'envoi de l'image. Réessayez dans un instant."
    );
    consoleError.mockRestore();
  });
});

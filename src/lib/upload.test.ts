const mockGetIdToken = jest.fn().mockResolvedValue("token-1");
let currentUser: { getIdToken: typeof mockGetIdToken } | null = {
  getIdToken: mockGetIdToken,
};

jest.mock("./firebase", () => ({
  auth: {
    get currentUser() {
      return currentUser;
    },
  },
}));

import { uploadProductImage, uploadShopLogo } from "@/lib/upload";

describe("upload", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    currentUser = { getIdToken: mockGetIdToken };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ url: "https://cloudinary.example/image.jpg" }),
    }) as jest.Mock;
  });

  it("uploads a product image without a folder field (defaults server-side)", async () => {
    const url = await uploadProductImage(new Blob(["x"]));

    expect(url).toBe("https://cloudinary.example/image.jpg");
    const body = (global.fetch as jest.Mock).mock.calls[0][1].body as FormData;
    expect(body.get("folder")).toBeNull();
  });

  it("uploads a shop logo with the shops folder", async () => {
    await uploadShopLogo(new Blob(["x"]));

    const body = (global.fetch as jest.Mock).mock.calls[0][1].body as FormData;
    expect(body.get("folder")).toBe("manushop/shops");
  });

  it("throws when nobody is signed in", async () => {
    currentUser = null;
    await expect(uploadProductImage(new Blob(["x"]))).rejects.toThrow(
      "connecté"
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("propagates the server's error message on failure", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Format non supporté." }),
    }) as jest.Mock;

    await expect(uploadProductImage(new Blob(["x"]))).rejects.toThrow(
      "Format non supporté."
    );
  });
});

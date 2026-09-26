jest.mock("jose", () => ({
  createRemoteJWKSet: jest.fn(() => "jwks-stub"),
  jwtVerify: jest.fn(),
}));

const verifyIdTokenAdminMock = jest.fn();
jest.mock("./firebaseAdmin", () => ({
  getAdminAuth: () => ({ verifyIdToken: verifyIdTokenAdminMock }),
}));

import { jwtVerify } from "jose";

import { verifyIdToken } from "./verifyIdToken";

const jwtVerifyMock = jwtVerify as jest.Mock;

describe("verifyIdToken", () => {
  beforeEach(() => {
    jwtVerifyMock.mockReset();
    verifyIdTokenAdminMock.mockReset();
    delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
  });

  it("returns null when the header is missing", async () => {
    expect(await verifyIdToken(null)).toBeNull();
    expect(jwtVerifyMock).not.toHaveBeenCalled();
  });

  it("returns null when the header doesn't use the Bearer scheme", async () => {
    expect(await verifyIdToken("Basic abc123")).toBeNull();
    expect(jwtVerifyMock).not.toHaveBeenCalled();
  });

  it("returns the uid and email for a valid token", async () => {
    jwtVerifyMock.mockResolvedValue({
      payload: { sub: "uid-1", email: "a@b.com" },
    });

    const result = await verifyIdToken("Bearer valid-token");

    expect(jwtVerifyMock).toHaveBeenCalledWith(
      "valid-token",
      "jwks-stub",
      expect.objectContaining({
        issuer: expect.stringContaining("securetoken.google.com"),
      })
    );
    expect(result).toEqual({ uid: "uid-1", email: "a@b.com" });
  });

  it("omits email when the claim isn't a string", async () => {
    jwtVerifyMock.mockResolvedValue({ payload: { sub: "uid-1" } });

    expect(await verifyIdToken("Bearer valid-token")).toEqual({
      uid: "uid-1",
      email: undefined,
    });
  });

  it("returns null when the payload has no subject", async () => {
    jwtVerifyMock.mockResolvedValue({ payload: {} });
    expect(await verifyIdToken("Bearer valid-token")).toBeNull();
  });

  it("returns null when verification throws (invalid or expired token)", async () => {
    jwtVerifyMock.mockRejectedValue(new Error("signature invalid"));
    expect(await verifyIdToken("Bearer bad-token")).toBeNull();
  });

  describe("with the local Auth emulator active", () => {
    beforeEach(() => {
      process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
    });

    it("delegates to firebase-admin instead of the production JWKS", async () => {
      verifyIdTokenAdminMock.mockResolvedValue({ uid: "uid-1", email: "a@b.com" });

      const result = await verifyIdToken("Bearer emulator-token");

      expect(verifyIdTokenAdminMock).toHaveBeenCalledWith("emulator-token");
      expect(jwtVerifyMock).not.toHaveBeenCalled();
      expect(result).toEqual({ uid: "uid-1", email: "a@b.com" });
    });

    it("returns null when the emulator token is invalid", async () => {
      verifyIdTokenAdminMock.mockRejectedValue(new Error("invalid token"));
      expect(await verifyIdToken("Bearer bad-token")).toBeNull();
    });
  });
});

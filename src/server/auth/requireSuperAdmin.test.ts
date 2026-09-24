jest.mock("./requireCaller", () => ({ requireCaller: jest.fn() }));

const getMock = jest.fn();
const docMock = jest.fn(() => ({ get: getMock }));
const collectionMock = jest.fn(() => ({ doc: docMock }));

jest.mock("../../lib/firebaseAdmin", () => ({
  getAdminDb: () => ({ collection: collectionMock }),
}));

import { requireCaller } from "@/server/auth/requireCaller";
import { requireSuperAdmin } from "@/server/auth/requireSuperAdmin";
import { ForbiddenError, UnauthenticatedError } from "@/server/errors";

const requireCallerMock = requireCaller as jest.Mock;

describe("requireSuperAdmin", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("propagates UnauthenticatedError when the token itself is invalid", async () => {
    requireCallerMock.mockRejectedValue(new UnauthenticatedError());
    await expect(requireSuperAdmin("bad-token")).rejects.toThrow(
      UnauthenticatedError
    );
    expect(collectionMock).not.toHaveBeenCalled();
  });

  it("throws ForbiddenError for an authenticated caller with no email", async () => {
    requireCallerMock.mockResolvedValue({ uid: "uid-1" });
    await expect(requireSuperAdmin("token")).rejects.toThrow(ForbiddenError);
    expect(collectionMock).not.toHaveBeenCalled();
  });

  it("throws ForbiddenError when the caller isn't in platformAdmins", async () => {
    requireCallerMock.mockResolvedValue({ uid: "uid-1", email: "a@b.com" });
    getMock.mockResolvedValue({ exists: false });

    await expect(requireSuperAdmin("token")).rejects.toThrow(ForbiddenError);
    expect(collectionMock).toHaveBeenCalledWith("platformAdmins");
    expect(docMock).toHaveBeenCalledWith("a@b.com");
  });

  it("returns the caller when they are a platform admin", async () => {
    requireCallerMock.mockResolvedValue({ uid: "uid-1", email: "A@B.com" });
    getMock.mockResolvedValue({ exists: true });

    expect(await requireSuperAdmin("token")).toEqual({
      uid: "uid-1",
      email: "A@B.com",
    });
    expect(docMock).toHaveBeenCalledWith("a@b.com");
  });
});

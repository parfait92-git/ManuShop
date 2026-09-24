jest.mock("../../lib/verifyIdToken", () => ({ verifyIdToken: jest.fn() }));

import { verifyIdToken } from "@/lib/verifyIdToken";
import { requireCaller } from "@/server/auth/requireCaller";
import { UnauthenticatedError } from "@/server/errors";

const verifyIdTokenMock = verifyIdToken as jest.Mock;

describe("requireCaller", () => {
  beforeEach(() => {
    verifyIdTokenMock.mockReset();
  });

  it("returns the verified caller for a valid token", async () => {
    verifyIdTokenMock.mockResolvedValue({ uid: "uid-1", email: "a@b.com" });

    expect(await requireCaller("valid-token")).toEqual({
      uid: "uid-1",
      email: "a@b.com",
    });
    expect(verifyIdTokenMock).toHaveBeenCalledWith("Bearer valid-token");
  });

  it("throws UnauthenticatedError when the token is missing or invalid", async () => {
    verifyIdTokenMock.mockResolvedValue(null);
    await expect(requireCaller("bad-token")).rejects.toThrow(
      UnauthenticatedError
    );
  });
});

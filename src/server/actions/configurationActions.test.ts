jest.mock("../auth/requireSuperAdmin", () => ({ requireSuperAdmin: jest.fn() }));

const setMock = jest.fn();
const docMock = jest.fn(() => ({ set: setMock }));
const collectionMock = jest.fn(() => ({ doc: docMock }));

jest.mock("../../lib/firebaseAdmin", () => ({
  getAdminDb: () => ({ collection: collectionMock }),
}));

import { requireSuperAdmin } from "@/server/auth/requireSuperAdmin";
import { setDemoCatalogueEnabledAction } from "@/server/actions/configurationActions";
import { ForbiddenError } from "@/server/errors";

const requireSuperAdminMock = requireSuperAdmin as jest.Mock;

describe("configurationActions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireSuperAdminMock.mockResolvedValue({ uid: "admin-1", email: "a@b.com" });
  });

  describe("setDemoCatalogueEnabledAction", () => {
    it("re-verifies Super Admin privilege before writing", async () => {
      await setDemoCatalogueEnabledAction("token", false);

      expect(requireSuperAdminMock).toHaveBeenCalledWith("token");
      expect(collectionMock).toHaveBeenCalledWith("configuration");
      expect(docMock).toHaveBeenCalledWith("general");
      expect(setMock).toHaveBeenCalledWith(
        { demoCatalogueEnabled: false },
        { merge: true }
      );
    });

    it("writes true when re-enabling", async () => {
      await setDemoCatalogueEnabledAction("token", true);
      expect(setMock).toHaveBeenCalledWith(
        { demoCatalogueEnabled: true },
        { merge: true }
      );
    });

    it("never writes when the caller isn't Super Admin", async () => {
      requireSuperAdminMock.mockRejectedValue(new ForbiddenError());
      await expect(
        setDemoCatalogueEnabledAction("token", false)
      ).rejects.toThrow(ForbiddenError);
      expect(setMock).not.toHaveBeenCalled();
    });
  });
});

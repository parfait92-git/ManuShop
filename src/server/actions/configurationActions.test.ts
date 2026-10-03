jest.mock("../auth/requireSuperAdmin", () => ({ requireSuperAdmin: jest.fn() }));

const setMock = jest.fn();
const docMock = jest.fn(() => ({ set: setMock }));
const collectionMock = jest.fn(() => ({ doc: docMock }));

const revalidatePathMock = jest.fn();
jest.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}));

jest.mock("../../lib/firebaseAdmin", () => ({
  getAdminDb: () => ({ collection: collectionMock }),
}));

import { requireSuperAdmin } from "@/server/auth/requireSuperAdmin";
import {
  setDemoCatalogueEnabledAction,
  setLaunchPromoAction,
} from "@/server/actions/configurationActions";
import { ForbiddenError, ValidationError } from "@/server/errors";

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

  describe("setLaunchPromoAction", () => {
    const promo = {
      enabled: true,
      eyebrow: "  Offre  ",
      title: "Votre boutique à moitié prix",
      description: "Profitez de -50 % sur votre premier mois.",
      endsAt: "2099-10-30T23:59:59+01:00",
    };

    it("re-verifies Super Admin privilege, saves the trimmed promotion and refreshes the homepage", async () => {
      await setLaunchPromoAction("token", promo);

      expect(requireSuperAdminMock).toHaveBeenCalledWith("token");
      expect(setMock).toHaveBeenCalledWith(
        { launchPromo: { ...promo, eyebrow: "Offre" } },
        { merge: true }
      );
      expect(revalidatePathMock).toHaveBeenCalledWith("/");
    });

    it("refuses an enabled offer whose end date is already past", async () => {
      await expect(
        setLaunchPromoAction("token", { ...promo, endsAt: "2020-01-01T00:00:00+01:00" })
      ).rejects.toBeInstanceOf(ValidationError);
      expect(setMock).not.toHaveBeenCalled();
    });

    it("refuses non Super Admin callers without writing", async () => {
      requireSuperAdminMock.mockRejectedValue(new ForbiddenError());
      await expect(setLaunchPromoAction("token", promo)).rejects.toBeInstanceOf(ForbiddenError);
      expect(setMock).not.toHaveBeenCalled();
    });
  });
});

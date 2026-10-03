jest.mock("../auth/requireSuperAdmin", () => ({ requireSuperAdmin: jest.fn() }));

const setMock = jest.fn();
const getMock = jest.fn();
const docMock = jest.fn(() => ({ set: setMock, get: getMock }));
const collectionMock = jest.fn(() => ({ doc: docMock }));

const revalidatePathMock = jest.fn();
jest.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}));

jest.mock("firebase-admin/firestore", () => ({
  FieldValue: { delete: () => ({ __op: "delete" }) },
}));

jest.mock("../../lib/firebaseAdmin", () => ({
  getAdminDb: () => ({ collection: collectionMock }),
}));

import { requireSuperAdmin } from "@/server/auth/requireSuperAdmin";
import {
  getSiteUrlSettingsAction,
  setDemoCatalogueEnabledAction,
  setLaunchPromoAction,
  setSiteUrlAction,
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

  // Domaine de la plateforme (2026-10-03).
  describe("setSiteUrlAction", () => {
    const fetchMock = jest.fn();
    beforeEach(() => {
      global.fetch = fetchMock as never;
      fetchMock.mockReset();
    });

    it("saves a domain once it answers as ManuShop, and refreshes every page", async () => {
      fetchMock.mockResolvedValue({ ok: true, json: async () => ({ app: "manushop" }) });

      expect(await setSiteUrlAction("token", "www.manushop.cm/")).toBe("https://www.manushop.cm");

      expect(requireSuperAdminMock).toHaveBeenCalledWith("token");
      expect(fetchMock.mock.calls[0][0]).toBe("https://www.manushop.cm/api/site-check");
      expect(setMock).toHaveBeenCalledWith({ siteUrl: "https://www.manushop.cm" }, { merge: true });
      expect(revalidatePathMock).toHaveBeenCalledWith("/", "layout");
    });

    it("refuses a domain that doesn't lead to ManuShop yet", async () => {
      fetchMock.mockResolvedValue({ ok: true, json: async () => ({ app: "autre" }) });
      await expect(setSiteUrlAction("token", "https://www.manushop.cm")).rejects.toThrow(
        /ne mène pas encore à ManuShop/
      );
      fetchMock.mockRejectedValue(new Error("ENOTFOUND"));
      await expect(setSiteUrlAction("token", "https://www.manushop.cm")).rejects.toThrow(ValidationError);
      expect(setMock).not.toHaveBeenCalled();
    });

    it("refuses an invalid address without contacting it", async () => {
      await expect(setSiteUrlAction("token", "http://manushop.cm")).rejects.toThrow(ValidationError);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("goes back to the deployment address when emptied", async () => {
      expect(await setSiteUrlAction("token", "  ")).toBeNull();
      expect(setMock).toHaveBeenCalledWith({ siteUrl: { __op: "delete" } }, { merge: true });
    });

    it("is reserved to the Super Admin", async () => {
      requireSuperAdminMock.mockRejectedValue(new ForbiddenError());
      await expect(setSiteUrlAction("token", "https://www.manushop.cm")).rejects.toThrow(ForbiddenError);
      await expect(getSiteUrlSettingsAction("token")).rejects.toThrow(ForbiddenError);
    });

    it("reports the configured domain and the fallback", async () => {
      getMock.mockResolvedValue({ data: () => ({ siteUrl: "https://www.manushop.cm" }) });
      expect(await getSiteUrlSettingsAction("token")).toEqual({
        configured: "https://www.manushop.cm",
        fallback: expect.any(String),
      });
    });
  });
});

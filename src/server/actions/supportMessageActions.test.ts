jest.mock("../auth/requireCaller", () => ({ requireCaller: jest.fn() }));
jest.mock("../auth/requireSuperAdmin", () => ({ requireSuperAdmin: jest.fn() }));

const serverTimestampMock = jest.fn(() => "SERVER_TIMESTAMP");
jest.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    serverTimestamp: () => serverTimestampMock(),
  },
}));

const setMock = jest.fn();
const updateMock = jest.fn();
const userGetMock = jest.fn();
const shopGetMock = jest.fn();
const messageGetMock = jest.fn();
const listGetMock = jest.fn();
const orderByMock = jest.fn(() => ({ get: listGetMock }));

const usersDocMock = jest.fn(() => ({ get: userGetMock }));
const shopsDocMock = jest.fn(() => ({ get: shopGetMock }));
const supportDocMock = jest.fn((id: string) => ({
  id,
  set: setMock,
  update: updateMock,
  get: messageGetMock,
}));
const supportNewDocMock = jest.fn(() => ({ id: "msg1", set: setMock }));

const collectionMock = jest.fn((name: string) => {
  if (name === "users") return { doc: usersDocMock };
  if (name === "shops") return { doc: shopsDocMock };
  if (name === "supportMessages") {
    return {
      doc: (id?: string) => (id ? supportDocMock(id) : supportNewDocMock()),
      orderBy: orderByMock,
    };
  }
  throw new Error(`Unexpected collection: ${name}`);
});

jest.mock("../../lib/firebaseAdmin", () => ({
  getAdminDb: () => ({ collection: collectionMock }),
}));

import { requireCaller } from "@/server/auth/requireCaller";
import { requireSuperAdmin } from "@/server/auth/requireSuperAdmin";
import {
  answerSupportMessageAction,
  listSupportMessagesAction,
  sendSupportMessageAction,
} from "@/server/actions/supportMessageActions";
import { ForbiddenError, NotFoundError, ValidationError } from "@/server/errors";

const requireCallerMock = requireCaller as jest.Mock;
const requireSuperAdminMock = requireSuperAdmin as jest.Mock;

function fakeDoc(id: string, data: Record<string, unknown>) {
  return { id, data: () => data };
}

describe("supportMessageActions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireCallerMock.mockResolvedValue({ uid: "u1", email: "merchant@example.com" });
    requireSuperAdminMock.mockResolvedValue({ uid: "admin-1", email: "a@b.com" });
  });

  describe("sendSupportMessageAction", () => {
    it("writes the message when the caller owns a shop with contactForm enabled", async () => {
      userGetMock.mockResolvedValue({
        data: () => ({ role: "admin", shopId: "shop1", displayName: "Ada" }),
      });
      shopGetMock.mockResolvedValue({
        data: () => ({ name: "Boutique Ada", premiumFeatures: ["contactForm"] }),
      });

      const result = await sendSupportMessageAction("token", "Objet", "Message");

      expect(requireCallerMock).toHaveBeenCalledWith("token");
      expect(setMock).toHaveBeenCalledWith({
        shopId: "shop1",
        shopName: "Boutique Ada",
        senderId: "u1",
        senderName: "Ada",
        subject: "Objet",
        body: "Message",
        status: "open",
        createdAt: "SERVER_TIMESTAMP",
      });
      expect(result).toEqual({ id: "msg1" });
    });

    it("rejects when the caller has no shop", async () => {
      userGetMock.mockResolvedValue({ data: () => ({ role: "client" }) });
      await expect(
        sendSupportMessageAction("token", "Objet", "Message")
      ).rejects.toThrow(ForbiddenError);
      expect(setMock).not.toHaveBeenCalled();
    });

    it("rejects when the shop doesn't have contactForm enabled", async () => {
      userGetMock.mockResolvedValue({
        data: () => ({ role: "admin", shopId: "shop1", displayName: "Ada" }),
      });
      shopGetMock.mockResolvedValue({
        data: () => ({ name: "Boutique Ada", premiumFeatures: [] }),
      });

      await expect(
        sendSupportMessageAction("token", "Objet", "Message")
      ).rejects.toThrow(ForbiddenError);
      expect(setMock).not.toHaveBeenCalled();
    });

    it("rejects an empty subject or body", async () => {
      userGetMock.mockResolvedValue({
        data: () => ({ role: "admin", shopId: "shop1", displayName: "Ada" }),
      });
      shopGetMock.mockResolvedValue({
        data: () => ({ name: "Boutique Ada", premiumFeatures: ["contactForm"] }),
      });

      await expect(
        sendSupportMessageAction("token", "  ", "Message")
      ).rejects.toThrow(ValidationError);
      await expect(
        sendSupportMessageAction("token", "Objet", "  ")
      ).rejects.toThrow(ValidationError);
      expect(setMock).not.toHaveBeenCalled();
    });
  });

  describe("listSupportMessagesAction", () => {
    it("re-verifies Super Admin privilege and maps Timestamps to ISO strings", async () => {
      listGetMock.mockResolvedValue({
        docs: [
          fakeDoc("msg1", {
            shopId: "shop1",
            shopName: "Boutique Ada",
            senderId: "u1",
            senderName: "Ada",
            subject: "Objet",
            body: "Message",
            status: "open",
            createdAt: { toDate: () => new Date("2026-01-01T00:00:00.000Z") },
          }),
        ],
      });

      const result = await listSupportMessagesAction("token");

      expect(requireSuperAdminMock).toHaveBeenCalledWith("token");
      expect(result).toEqual([
        expect.objectContaining({
          id: "msg1",
          createdAt: "2026-01-01T00:00:00.000Z",
          reply: undefined,
        }),
      ]);
    });

    it("never reads Firestore when the caller isn't Super Admin", async () => {
      requireSuperAdminMock.mockRejectedValue(new ForbiddenError());
      await expect(listSupportMessagesAction("token")).rejects.toThrow(ForbiddenError);
      expect(listGetMock).not.toHaveBeenCalled();
    });
  });

  describe("answerSupportMessageAction", () => {
    it("re-verifies Super Admin privilege before writing the reply", async () => {
      messageGetMock.mockResolvedValue({ exists: true });

      await answerSupportMessageAction("token", "msg1", "Réponse");

      expect(requireSuperAdminMock).toHaveBeenCalledWith("token");
      expect(updateMock).toHaveBeenCalledWith({
        status: "answered",
        reply: { body: "Réponse", createdAt: "SERVER_TIMESTAMP" },
      });
    });

    it("rejects an empty reply", async () => {
      messageGetMock.mockResolvedValue({ exists: true });
      await expect(
        answerSupportMessageAction("token", "msg1", "   ")
      ).rejects.toThrow(ValidationError);
      expect(updateMock).not.toHaveBeenCalled();
    });

    it("throws NotFoundError when the message doesn't exist", async () => {
      messageGetMock.mockResolvedValue({ exists: false });
      await expect(
        answerSupportMessageAction("token", "msg1", "Réponse")
      ).rejects.toThrow(NotFoundError);
      expect(updateMock).not.toHaveBeenCalled();
    });

    it("never writes when the caller isn't Super Admin", async () => {
      requireSuperAdminMock.mockRejectedValue(new ForbiddenError());
      await expect(
        answerSupportMessageAction("token", "msg1", "Réponse")
      ).rejects.toThrow(ForbiddenError);
      expect(updateMock).not.toHaveBeenCalled();
    });
  });
});

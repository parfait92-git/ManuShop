import { Timestamp } from "firebase/firestore";

jest.mock("../lib/firebase", () => ({
  auth: { currentUser: { getIdToken: jest.fn().mockResolvedValue("token-1") } },
}));

const sendSupportMessageAction = jest.fn();
const sendContactMessageAction = jest.fn();
const listSupportMessagesAction = jest.fn();
const countOpenSupportMessagesAction = jest.fn();
const answerSupportMessageAction = jest.fn();
jest.mock("../server/actions/supportMessageActions", () => ({
  sendSupportMessageAction: (...args: unknown[]) => sendSupportMessageAction(...args),
  sendContactMessageAction: (...args: unknown[]) =>
    sendContactMessageAction(...args),
  listSupportMessagesAction: (...args: unknown[]) =>
    listSupportMessagesAction(...args),
  countOpenSupportMessagesAction: (...args: unknown[]) =>
    countOpenSupportMessagesAction(...args),
  answerSupportMessageAction: (...args: unknown[]) =>
    answerSupportMessageAction(...args),
}));

import { SupportMessageService } from "@/services/SupportMessageService";
import type { ISupportMessageRepository } from "@/repositories/interfaces/ISupportMessageRepository";
import type { SupportMessage } from "@/models/support/SupportMessage";
import type { SupportMessageDto } from "@/server/actions/supportMessageActions";

function fakeMessage(overrides: Partial<SupportMessage> = {}): SupportMessage {
  return {
    id: "msg1",
    shopId: "shop1",
    shopName: "Boutique Ada",
    senderId: "u1",
    senderName: "Ada",
    subject: "Objet",
    body: "Message",
    status: "open",
    createdAt: Timestamp.fromDate(new Date("2026-01-01T00:00:00.000Z")),
    ...overrides,
  };
}

function fakeDto(overrides: Partial<SupportMessageDto> = {}): SupportMessageDto {
  return {
    id: "msg1",
    shopId: "shop1",
    shopName: "Boutique Ada",
    senderId: "u1",
    senderName: "Ada",
    subject: "Objet",
    body: "Message",
    status: "open",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("SupportMessageService", () => {
  let supportMessages: jest.Mocked<ISupportMessageRepository>;
  let service: SupportMessageService;

  beforeEach(() => {
    jest.clearAllMocks();
    supportMessages = { listForShop: jest.fn() };
    service = new SupportMessageService(supportMessages);
  });

  describe("listForShop", () => {
    it("delegates to the repository and sorts most recent first", async () => {
      const older = fakeMessage({
        id: "older",
        createdAt: Timestamp.fromDate(new Date("2026-01-01")),
      });
      const newer = fakeMessage({
        id: "newer",
        createdAt: Timestamp.fromDate(new Date("2026-01-02")),
      });
      supportMessages.listForShop.mockResolvedValue([older, newer]);

      const result = await service.listForShop("shop1");

      expect(supportMessages.listForShop).toHaveBeenCalledWith("shop1");
      expect(result.map((m) => m.id)).toEqual(["newer", "older"]);
    });
  });

  describe("sendMessage", () => {
    it("delegates to the server action with the caller's ID token", async () => {
      sendSupportMessageAction.mockResolvedValue({ id: "msg1" });
      const result = await service.sendMessage("Objet", "Message");
      expect(sendSupportMessageAction).toHaveBeenCalledWith(
        "token-1",
        "Objet",
        "Message"
      );
      expect(result).toEqual({ id: "msg1" });
    });
  });

  describe("sendContactMessage", () => {
    it("delegates to the server action with the caller's ID token", async () => {
      sendContactMessageAction.mockResolvedValue({ id: "msg1" });
      const result = await service.sendContactMessage("Objet", "Message");
      expect(sendContactMessageAction).toHaveBeenCalledWith(
        "token-1",
        "Objet",
        "Message"
      );
      expect(result).toEqual({ id: "msg1" });
    });
  });

  describe("countOpenMessages", () => {
    it("delegates to the server action with the caller's ID token", async () => {
      countOpenSupportMessagesAction.mockResolvedValue(3);
      const result = await service.countOpenMessages();
      expect(countOpenSupportMessagesAction).toHaveBeenCalledWith("token-1");
      expect(result).toBe(3);
    });
  });

  describe("listAllMessages", () => {
    it("delegates to the server action and reconstructs Timestamps", async () => {
      listSupportMessagesAction.mockResolvedValue([
        fakeDto({
          reply: { body: "Réponse", createdAt: "2026-01-02T00:00:00.000Z" },
        }),
      ]);

      const [message] = await service.listAllMessages();

      expect(listSupportMessagesAction).toHaveBeenCalledWith("token-1");
      expect(message.createdAt.toDate().toISOString()).toBe(
        "2026-01-01T00:00:00.000Z"
      );
      expect(message.reply?.createdAt.toDate().toISOString()).toBe(
        "2026-01-02T00:00:00.000Z"
      );
    });

    it("leaves reply undefined when there is none", async () => {
      listSupportMessagesAction.mockResolvedValue([fakeDto()]);
      const [message] = await service.listAllMessages();
      expect(message.reply).toBeUndefined();
    });
  });

  describe("replyToMessage", () => {
    it("delegates to the server action with the caller's ID token", async () => {
      await service.replyToMessage("msg1", "Réponse");
      expect(answerSupportMessageAction).toHaveBeenCalledWith(
        "token-1",
        "msg1",
        "Réponse"
      );
    });
  });
});

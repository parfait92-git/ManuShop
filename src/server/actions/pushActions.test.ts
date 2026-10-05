jest.mock("../auth/requireCaller", () => ({ requireCaller: jest.fn(async () => ({ uid: "u1" })) }));
const savePushTokenMock = jest.fn(async () => undefined);
const sendPushMock = jest.fn(async () => 2);
const tokenGetMock = jest.fn();
const tokenDeleteMock = jest.fn();
jest.mock("../push/sendPush", () => ({
  PUSH_TOKENS_COLLECTION: "pushTokens",
  pushTokenId: (t: string) => `id-${t}`,
  savePushToken: (...a: unknown[]) => savePushTokenMock(...(a as [])),
  sendPush: (...a: unknown[]) => sendPushMock(...(a as [])),
}));
jest.mock("../../lib/firebaseAdmin", () => ({
  getAdminDb: () => ({ collection: () => ({ doc: () => ({ get: tokenGetMock, delete: tokenDeleteMock }) }) }),
}));

import { registerPushTokenAction, sendTestPushAction, unregisterPushTokenAction } from "./pushActions";
import { ValidationError } from "@/server/errors";

const TOKEN = "fcm-token-0123456789-abcdefghij";

beforeEach(() => jest.clearAllMocks());

describe("pushActions", () => {
  it("registers the caller's device", async () => {
    await registerPushTokenAction("t", TOKEN, "Chrome Android");
    expect(savePushTokenMock).toHaveBeenCalledWith(expect.anything(), "u1", TOKEN, "Chrome Android");
  });

  it.each(["", "court", `avec espace ${"x".repeat(30)}`])("refuses a malformed token %p", async (token) => {
    await expect(registerPushTokenAction("t", token, "")).rejects.toThrow(ValidationError);
  });

  it("only unregisters a device that belongs to the caller", async () => {
    tokenGetMock.mockResolvedValue({ exists: true, data: () => ({ userId: "someone-else" }) });
    await unregisterPushTokenAction("t", TOKEN);
    expect(tokenDeleteMock).not.toHaveBeenCalled();
    tokenGetMock.mockResolvedValue({ exists: true, data: () => ({ userId: "u1" }) });
    await unregisterPushTokenAction("t", TOKEN);
    expect(tokenDeleteMock).toHaveBeenCalled();
  });

  it("sends a test notification to the caller's devices", async () => {
    expect(await sendTestPushAction("t")).toEqual({ sent: 2 });
    expect(sendPushMock).toHaveBeenCalledWith(expect.anything(), ["u1"], expect.objectContaining({ title: "Notifications activées" }));
  });
});

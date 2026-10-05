const sendEachForMulticastMock = jest.fn();
let messagingAvailable = true;
jest.mock("../../lib/firebaseAdmin", () => ({
  getAdminMessaging: async () => (messagingAvailable ? { sendEachForMulticast: sendEachForMulticastMock } : null),
}));
jest.mock("firebase-admin/firestore", () => ({ FieldValue: { serverTimestamp: () => "now" } }));

import { pushTokenId, savePushToken, sendPush, shopTeamIds, superAdminIds } from "./sendPush";

/** Faux Firestore : collections en mémoire, requêtes `where(champ, op, valeur)`. */
function fakeDb(data: Record<string, Record<string, Record<string, unknown>>>) {
  const deleted: string[] = [];
  const sets: [string, unknown][] = [];
  const query = (name: string, filters: [string, string, unknown][] = []) => ({
    where: (field: string, op: string, value: unknown) => query(name, [...filters, [field, op, value]]),
    get: async () => ({
      docs: Object.entries(data[name] ?? {})
        .filter(([, doc]) =>
          filters.every(([f, op, v]) => (op === "in" ? (v as unknown[]).includes(doc[f]) : doc[f] === v))
        )
        .map(([id, doc]) => ({ id, data: () => doc })),
    }),
    doc: (id: string) => ({
      get: async () => ({ data: () => data[name]?.[id] }),
      delete: async () => deleted.push(`${name}/${id}`),
      set: async (value: unknown) => sets.push([`${name}/${id}`, value]),
    }),
  });
  return { db: { collection: (name: string) => query(name) } as never, deleted, sets };
}

beforeEach(() => {
  jest.clearAllMocks();
  messagingAvailable = true;
  jest.spyOn(console, "error").mockImplementation(() => {});
});

describe("sendPush", () => {
  it("sends a data-only message to every device of the recipients, and forgets devices that no longer exist", async () => {
    const { db, deleted } = fakeDb({
      pushTokens: {
        t1: { userId: "u1", token: "tok-1" },
        t2: { userId: "u1", token: "tok-2" },
        t3: { userId: "u3", token: "tok-3" },
      },
    });
    sendEachForMulticastMock.mockResolvedValue({
      successCount: 1,
      responses: [{ success: true }, { success: false, error: { code: "messaging/registration-token-not-registered" } }],
    });

    const sent = await sendPush(db, ["u1", "u2", "u1"], { title: "Nouvelle commande", body: "Fatou", link: "/dashboard/orders", tag: "o1" });

    expect(sent).toBe(1);
    expect(sendEachForMulticastMock).toHaveBeenCalledWith({
      tokens: ["tok-1", "tok-2"],
      data: { title: "Nouvelle commande", body: "Fatou", link: "/dashboard/orders", tag: "o1" },
      webpush: { headers: { Urgency: "high", TTL: "86400" } },
    });
    expect(deleted).toEqual(["pushTokens/t2"]);
  });

  it("does nothing without recipients, without devices, or on the emulators", async () => {
    const { db } = fakeDb({ pushTokens: {} });
    expect(await sendPush(db, [], { title: "", body: "", link: "/" })).toBe(0);
    expect(await sendPush(db, ["u1"], { title: "", body: "", link: "/" })).toBe(0);
    messagingAvailable = false;
    expect(await sendPush(db, ["u1"], { title: "", body: "", link: "/" })).toBe(0);
    expect(sendEachForMulticastMock).not.toHaveBeenCalled();
  });

  it("never fails the action that triggered it", async () => {
    const { db } = fakeDb({ pushTokens: { t1: { userId: "u1", token: "tok-1" } } });
    sendEachForMulticastMock.mockRejectedValue(new Error("FCM indisponible"));
    await expect(sendPush(db, ["u1"], { title: "x", body: "y", link: "/" })).resolves.toBe(0);
  });
});

describe("destinataires", () => {
  it("finds the shop team: its owner and the admins and sellers working on it", async () => {
    const { db } = fakeDb({
      shops: { s1: { ownerId: "owner" } },
      users: {
        owner: { role: "admin", shopId: "s1" },
        seller: { role: "seller", shopId: "s1" },
        client: { role: "client", shopId: "s1" },
        other: { role: "seller", shopId: "s2" },
      },
    });
    expect((await shopTeamIds(db, "s1")).sort()).toEqual(["owner", "seller"]);
  });

  it("finds the Super Admins from their e-mail addresses", async () => {
    const { db } = fakeDb({
      platformAdmins: { "admin@manushop.cm": { role: "super-admin" } },
      users: { a: { email: "admin@manushop.cm" }, b: { email: "x@y.z" } },
    });
    expect(await superAdminIds(db)).toEqual(["a"]);
  });

  it("stores a device under the fingerprint of its token", async () => {
    const { db, sets } = fakeDb({});
    await savePushToken(db, "u1", "tok-1", "Chrome");
    expect(sets).toEqual([[`pushTokens/${pushTokenId("tok-1")}`, { userId: "u1", token: "tok-1", userAgent: "Chrome", updatedAt: "now" }]]);
    expect(pushTokenId("tok-1")).toHaveLength(40);
  });
});

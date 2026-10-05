const sendPushMock = jest.fn(async () => 1);
jest.mock("./sendPush", () => ({
  sendPush: (...a: unknown[]) => sendPushMock(...(a as [])),
  shopTeamIds: async () => ["owner", "seller"],
  superAdminIds: async () => ["admin"],
}));

import {
  pushNewOrder,
  pushOrderStatus,
  pushPromoEnding,
  pushStockAlerts,
  pushSupportMessage,
} from "./events";

const db = {} as never;
const lastMessage = () => (sendPushMock.mock.calls.at(-1) as unknown[])[2];
const lastRecipients = () => (sendPushMock.mock.calls.at(-1) as unknown[])[1];

beforeEach(() => jest.clearAllMocks());

describe("notifications push : qui reçoit quoi", () => {
  it("announces a new order to the shop team, with the client, units and amount", async () => {
    await pushNewOrder(db, { shopId: "s1", orderId: "o1", clientName: "Fatou", units: 3, total: 12500 });
    expect(lastRecipients()).toEqual(["owner", "seller"]);
    expect(lastMessage()).toEqual({
      title: "Nouvelle commande",
      body: "Fatou · 3 articles · 12 500 FCFA",
      link: "/dashboard/orders?status=under_review",
      tag: "order-o1",
    });
  });

  it("groups stock alerts, saying which items are sold out", async () => {
    await pushStockAlerts(db, "s1", [
      { name: "Huile — 250 ml", stock: 0 },
      { name: "Savon", stock: 2 },
    ]);
    expect(lastMessage()).toEqual(
      expect.objectContaining({ title: "Ruptures et stocks faibles", body: "Huile — 250 ml : épuisé · Savon : plus que 2" })
    );
    sendPushMock.mockClear();
    await pushStockAlerts(db, "s1", []);
    expect(sendPushMock).not.toHaveBeenCalled();
  });

  it("tells the client where their order is, and asks for a review once delivered", async () => {
    await pushOrderStatus(db, { clientId: "c1", orderId: "o1", status: "delivering", shopName: "Chez Awa" });
    expect(lastRecipients()).toEqual(["c1"]);
    expect(lastMessage()).toEqual(
      expect.objectContaining({ title: "Commande en route", body: "Chez Awa : votre commande est en cours de livraison.", link: "/mes-commandes" })
    );
    await pushOrderStatus(db, { clientId: "c1", orderId: "o1", status: "delivered", shopName: "Chez Awa" });
    expect(lastMessage()).toEqual(expect.objectContaining({ link: "/mes-commandes/o1/avis" }));

    sendPushMock.mockClear();
    await pushOrderStatus(db, { orderId: "o2", status: "delivered", shopName: "Chez Awa" });
    expect(sendPushMock).not.toHaveBeenCalled();
  });

  it("sends merchant messages to the Super Admins and promotion reminders to the team", async () => {
    await pushSupportMessage(db, { shopName: "Chez Awa", subject: "Thème" });
    expect(lastRecipients()).toEqual(["admin"]);
    await pushPromoEnding(db, { shopId: "s1", products: ["Masque", "Savon"] });
    expect(lastMessage()).toEqual(
      expect.objectContaining({ title: "Promotions bientôt terminées", body: "Se termine demain soir : Masque, Savon." })
    );
  });

  it("never fails when the recipients can't be found", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    sendPushMock.mockRejectedValueOnce(new Error("Firestore indisponible"));
    await expect(pushNewOrder(db, { shopId: "s1", orderId: "o1", clientName: "F", units: 1, total: 1 })).resolves.toBe(0);
  });
});

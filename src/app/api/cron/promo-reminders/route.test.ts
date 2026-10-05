/** @jest-environment node */
const pushPromoEndingMock = jest.fn(async () => 1);
jest.mock("../../../../server/push/events", () => ({
  pushPromoEnding: (...a: unknown[]) => pushPromoEndingMock(...(a as [])),
}));
const products: Record<string, unknown>[] = [];
jest.mock("../../../../lib/firebaseAdmin", () => ({
  getAdminDb: () => ({
    collection: () => ({
      where: () => ({ get: async () => ({ docs: products.map((p) => ({ data: () => p })) }) }),
    }),
  }),
}));

import { GET } from "./route";

/** Date de fin telle qu'enregistrée : minuit UTC du jour de fin. */
const endDay = (daysFromNow: number) => {
  const d = new Date(Date.now() + daysFromNow * 86_400_000);
  return { toDate: () => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())) };
};
const call = (auth?: string) =>
  GET(new Request("http://localhost/api/cron/promo-reminders", { headers: auth ? { authorization: auth } : {} }));

beforeEach(() => {
  jest.clearAllMocks();
  products.length = 0;
  process.env.CRON_SECRET = "secret";
});

describe("rappel de fin de promotion", () => {
  it("only answers Vercel's scheduler", async () => {
    expect((await call()).status).toBe(401);
    expect((await call("Bearer faux")).status).toBe(401);
    delete process.env.CRON_SECRET;
    expect((await call("Bearer undefined")).status).toBe(401);
    expect(pushPromoEndingMock).not.toHaveBeenCalled();
  });

  it("reminds each shop of the promotions ending tomorrow evening, once", async () => {
    // À 08:00 (heure de Douala), une promotion qui finit demain se termine
    // dans 24 à 48 heures ; celle d'aujourd'hui dans moins de 24 heures.
    jest.useFakeTimers().setSystemTime(new Date("2026-10-04T07:00:00Z"));
    products.push(
      { shopId: "s1", name: "Masque", promoEnd: endDay(1) },
      { shopId: "s1", name: "Savon", promoEnd: endDay(1) },
      { shopId: "s2", name: "Huile", promoEnd: endDay(0) },
      { shopId: "s2", name: "Gommage", promoEnd: endDay(1), isPublished: false },
      { shopId: "s3", name: "Wax", promoEnd: endDay(1), deletedAt: {} },
      { shopId: "s4", name: "Sans fin" }
    );

    const response = await call("Bearer secret");

    expect(await response.json()).toEqual({ shops: 1, products: 2 });
    expect(pushPromoEndingMock).toHaveBeenCalledTimes(1);
    expect(pushPromoEndingMock).toHaveBeenCalledWith(expect.anything(), { shopId: "s1", products: ["Masque", "Savon"] });
    jest.useRealTimers();
  });
});

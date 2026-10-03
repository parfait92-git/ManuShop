import { generateKeyPairSync } from "crypto";

import { checkHistory, GENESIS_HASH, nextHistoryEvent, type HistoryEvent } from "./orderHistory";
import { resetSigningKeysForTests } from "./signing";

beforeEach(() => {
  process.env.INVOICE_SIGNING_KEY = generateKeyPairSync("ed25519")
    .privateKey.export({ type: "pkcs8", format: "der" })
    .toString("base64");
  resetSigningKeysForTests();
});

/** Chaîne de trois étapes : reçue, livrée, facture émise. */
function chain(orderId = "o1"): { events: HistoryEvent[]; head: { historySeq: number; historyHash: string } } {
  const events: HistoryEvent[] = [];
  let head = {};
  const facts = [
    { type: "status", status: "under_review" },
    { type: "status", status: "delivered" },
    { type: "invoice", number: "F-00001" },
  ] as const;
  facts.forEach((fact, index) => {
    const event = nextHistoryEvent(orderId, head, fact, new Date(Date.UTC(2026, 9, 3, 8 + index)));
    events.push(event);
    head = { historySeq: event.seq, historyHash: event.hash };
  });
  return { events, head: head as { historySeq: number; historyHash: string } };
}

describe("orderHistory", () => {
  it("chains each event to the previous one and signs it", () => {
    const { events, head } = chain();
    expect(events[0].prevHash).toBe(GENESIS_HASH);
    expect(events[1].prevHash).toBe(events[0].hash);
    expect(events.every((e) => e.signature && e.keyId)).toBe(true);
    expect(checkHistory("o1", head, events)).toEqual(
      expect.objectContaining({ intact: true, signatures: "valid" })
    );
  });

  it("detects a modified step", () => {
    const { events, head } = chain();
    const forged = events.map((e, i) =>
      i === 1 ? { ...e, fact: { type: "status" as const, status: "returned" as const } } : e
    );
    expect(checkHistory("o1", head, forged).intact).toBe(false);
  });

  it("detects a re-dated step", () => {
    const { events, head } = chain();
    const forged = events.map((e, i) => (i === 1 ? { ...e, atMs: e.atMs - 86_400_000 } : e));
    expect(checkHistory("o1", head, forged).intact).toBe(false);
  });

  it("detects a deleted step, even the last one", () => {
    const { events, head } = chain();
    expect(checkHistory("o1", head, events.slice(0, 2)).intact).toBe(false);
    expect(checkHistory("o1", head, [events[0], events[2]]).intact).toBe(false);
  });

  it("detects a recomputed hash that the key didn't sign", () => {
    const { events, head } = chain();
    const forged = events.map((e, i) => (i === 2 ? { ...e, signature: events[1].signature } : e));
    expect(checkHistory("o1", head, forged).signatures).toBe("invalid");
  });

  it("refuses the history of another order", () => {
    const { events, head } = chain("o1");
    expect(checkHistory("o2", head, events).intact).toBe(false);
  });

  it("accepts an order without history (placed before the journal)", () => {
    expect(checkHistory("o1", {}, [])).toEqual({ intact: true, signatures: "none", events: [] });
  });
});

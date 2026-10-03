import type { Order } from "@/models/order/Order";

import {
  buildClientDirectory,
  clientWhatsAppLink,
  clientsToCsv,
  matchesClient,
  sortClients,
} from "./clientDirectory";

const NOW = new Date("2026-10-02T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => {
  const d = new Date(NOW.getTime() - n * DAY);
  return { toDate: () => d, toMillis: () => d.getTime() } as never;
};

let seq = 0;
function order(overrides: Partial<Order>): Order {
  seq += 1;
  return {
    id: `o${seq}`,
    shopId: "shop-1",
    clientName: "Awa",
    clientPhone: "",
    clientAddress: "",
    items: [{ productId: "p", name: "P", quantity: 1, unitPrice: 1000 }],
    subtotal: 1000,
    discount: 0,
    total: 1000,
    status: "delivered",
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
    ...overrides,
  };
}

describe("buildClientDirectory", () => {
  it("merges an online order and an in-store order of the same phone number, written differently", () => {
    const clients = buildClientDirectory(
      [
        order({ clientId: "uid-1", clientName: "Awa D.", clientPhone: "+237 6 90 00 00 01", createdAt: daysAgo(10) }),
        order({ clientName: "Awa Diallo", clientPhone: "237690000001", createdAt: daysAgo(2) }),
      ],
      NOW
    );

    expect(clients).toHaveLength(1);
    expect(clients[0]).toMatchObject({ name: "Awa Diallo", ordersCount: 2, hasAccount: true });
  });

  it("falls back to the account, then to the name, when there is no usable phone", () => {
    const clients = buildClientDirectory(
      [
        order({ clientId: "uid-1", clientName: "A" }),
        order({ clientId: "uid-1", clientName: "A bis" }),
        order({ clientName: "Paul" }),
        order({ clientName: " paul " }),
      ],
      NOW
    );
    expect(clients.map((c) => c.ordersCount).sort()).toEqual([2, 2]);
  });

  it("counts only delivered orders in the amount spent", () => {
    const [client] = buildClientDirectory(
      [
        order({ clientPhone: "690000001", total: 5000 }),
        order({ clientPhone: "690000001", total: 3000, status: "cancelled" }),
        order({ clientPhone: "690000001", total: 2000, status: "under_review" }),
      ],
      NOW
    );
    expect(client).toMatchObject({ ordersCount: 3, deliveredCount: 1, totalSpent: 5000 });
  });

  it("tags new, loyal and inactive clients", () => {
    const clients = buildClientDirectory(
      [
        order({ clientPhone: "600000001", createdAt: daysAgo(5) }),
        ...[200, 150, 120].map((d) => order({ clientPhone: "600000002", createdAt: daysAgo(d) })),
        order({ clientPhone: "600000003", createdAt: daysAgo(60) }),
      ],
      NOW
    );
    const byPhone = Object.fromEntries(clients.map((c) => [c.phone, c.segments]));
    expect(byPhone["600000001"]).toEqual(["new"]);
    expect(byPhone["600000002"]).toEqual(["loyal", "inactive"]);
    expect(byPhone["600000003"]).toEqual([]);
  });
});

describe("tri, recherche, contact et export", () => {
  const clients = buildClientDirectory(
    [
      order({ clientName: "Bernard", clientPhone: "+237 690 11 22 33", total: 9000, createdAt: daysAgo(20) }),
      order({ clientName: "Alice", clientPhone: "699000000", total: 1000, createdAt: daysAgo(1) }),
    ],
    NOW
  );

  it("sorts by recent order, amount spent or name", () => {
    expect(sortClients(clients, "recent").map((c) => c.name)).toEqual(["Alice", "Bernard"]);
    expect(sortClients(clients, "spent").map((c) => c.name)).toEqual(["Bernard", "Alice"]);
    expect(sortClients(clients, "name").map((c) => c.name)).toEqual(["Alice", "Bernard"]);
  });

  it("finds a client by name or by phone digits, whatever the spacing", () => {
    const bernard = clients.find((c) => c.name === "Bernard")!;
    expect(matchesClient(bernard, "bern")).toBe(true);
    expect(matchesClient(bernard, "11 22 33")).toBe(true);
    expect(matchesClient(bernard, "alice")).toBe(false);
  });

  it("builds a WhatsApp link only from a usable number", () => {
    expect(clientWhatsAppLink("+237 690 11 22 33")).toBe("https://wa.me/237690112233");
    expect(clientWhatsAppLink("")).toBeNull();
  });

  it("exports a CSV Excel opens directly (BOM, semicolons, quoted cells)", () => {
    const csv = clientsToCsv(
      buildClientDirectory([order({ clientName: 'Awa "la grande"; Douala', clientPhone: "690" })], NOW)
    );
    expect(csv.startsWith("﻿Nom;Téléphone;")).toBe(true);
    expect(csv).toContain('"Awa ""la grande""; Douala"');
  });
});

jest.mock("../lib/firebase", () => ({
  auth: { currentUser: { getIdToken: jest.fn().mockResolvedValue("token-1") } },
}));

const restockProductAction = jest.fn();
const adjustStockAction = jest.fn();
const recordInitialStockAction = jest.fn();
jest.mock("../server/actions/stockActions", () => ({
  restockProductAction: (...args: unknown[]) => restockProductAction(...args),
  adjustStockAction: (...args: unknown[]) => adjustStockAction(...args),
  recordInitialStockAction: (...args: unknown[]) => recordInitialStockAction(...args),
}));

import { StockService } from "@/services/StockService";
import type { IStockMovementRepository } from "@/repositories/interfaces/IStockMovementRepository";
import type { StockMovement } from "@/models/stock/StockMovement";

const at = (ms: number) => ({ toMillis: () => ms }) as StockMovement["createdAt"];

describe("StockService", () => {
  let movements: jest.Mocked<IStockMovementRepository>;
  let service: StockService;

  beforeEach(() => {
    jest.clearAllMocks();
    movements = { listByProduct: jest.fn(), listByShop: jest.fn() };
    service = new StockService(movements);
  });

  it("lists a product's history newest first, a movement just written on top", async () => {
    movements.listByProduct.mockResolvedValue([
      { id: "old", createdAt: at(1) },
      { id: "pending" },
      { id: "new", createdAt: at(2) },
    ] as StockMovement[]);

    const list = await service.listProductHistory("shop-1", "p1");

    expect(movements.listByProduct).toHaveBeenCalledWith("shop-1", "p1");
    expect(list.map((m) => m.id)).toEqual(["pending", "new", "old"]);
  });

  it("restocks and adjusts through the server with the caller's token", async () => {
    restockProductAction.mockResolvedValue({ stockAfter: 14 });
    adjustStockAction.mockResolvedValue({ stockAfter: 1 });

    expect(await service.restock({ productId: "p1", quantity: 10 })).toBe(14);
    expect(await service.adjust({ productId: "p1", countedStock: 1, note: "Casse" })).toBe(1);
    await service.recordInitialStock("p1");

    expect(restockProductAction).toHaveBeenCalledWith("token-1", { productId: "p1", quantity: 10 });
    expect(adjustStockAction).toHaveBeenCalledWith("token-1", { productId: "p1", countedStock: 1, note: "Casse" });
    expect(recordInitialStockAction).toHaveBeenCalledWith("token-1", "p1");
  });
});

// See ProductService.test.ts: avoids loading the real Firebase SDK via the
// repository's transitive "@/lib/firebase" import.
jest.mock("../lib/firebase", () => ({
  db: {},
}));

import { ActivityLogService } from "@/services/ActivityLogService";
import type { IActivityLogRepository } from "@/repositories/interfaces/IActivityLogRepository";
import type { ActivityLogEntry } from "@/models/activity/ActivityLogEntry";

const CONTEXT = { shopId: "shop-1", actorId: "uid-1", actorName: "Ada Diallo" };

describe("ActivityLogService", () => {
  let logs: jest.Mocked<IActivityLogRepository>;
  let service: ActivityLogService;

  beforeEach(() => {
    logs = {
      listByShop: jest.fn(),
      create: jest.fn(),
    };
    service = new ActivityLogService(logs);
  });

  it("listRecent delegates to the repository", async () => {
    const entry = { id: "e1" } as ActivityLogEntry;
    logs.listByShop.mockResolvedValue([entry]);

    const result = await service.listRecent("shop-1");

    expect(logs.listByShop).toHaveBeenCalledWith("shop-1");
    expect(result).toEqual([entry]);
  });

  it("logs a product publication event with the product name in metadata", async () => {
    await service.logProductPublished(CONTEXT, "p1", "Ensemble Wax");

    expect(logs.create).toHaveBeenCalledWith({
      shopId: "shop-1",
      actorId: "uid-1",
      actorName: "Ada Diallo",
      action: "product.published",
      targetType: "product",
      targetId: "p1",
      metadata: { productName: "Ensemble Wax" },
    });
  });

  it("logs an unpublication event", async () => {
    await service.logProductUnpublished(CONTEXT, "p1", "Ensemble Wax");
    expect(logs.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: "product.unpublished" })
    );
  });

  it("logs a product trashed/restored event", async () => {
    await service.logProductTrashed(CONTEXT, "p1", "Ensemble Wax");
    expect(logs.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: "product.trashed" })
    );

    await service.logProductRestored(CONTEXT, "p1", "Ensemble Wax");
    expect(logs.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: "product.restored" })
    );
  });

  it("logs a category trashed/restored event", async () => {
    await service.logCategoryTrashed(CONTEXT, "c1", "Mode");
    expect(logs.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: "category.trashed", targetType: "category" })
    );

    await service.logCategoryRestored(CONTEXT, "c1", "Mode");
    expect(logs.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: "category.restored", targetType: "category" })
    );
  });

  it("logs a shop settings update, targeting the shop itself", async () => {
    await service.logShopSettingsUpdated(CONTEXT);

    expect(logs.create).toHaveBeenCalledWith({
      shopId: "shop-1",
      actorId: "uid-1",
      actorName: "Ada Diallo",
      action: "shop.settings_updated",
      targetType: "shop",
      targetId: "shop-1",
      metadata: undefined,
    });
  });

  it("logs an order creation event with the client name in metadata", async () => {
    await service.logOrderCreated(CONTEXT, "o1", "Fatou Ba");
    expect(logs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "order.created",
        targetType: "order",
        targetId: "o1",
        metadata: { clientName: "Fatou Ba" },
      })
    );
  });

  it("logs an order status change with the new status in metadata", async () => {
    await service.logOrderStatusChanged(CONTEXT, "o1", "delivering");
    expect(logs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "order.status_changed",
        targetType: "order",
        metadata: { status: "delivering" },
      })
    );
  });

  it("logs an order cancellation with the reason in metadata", async () => {
    await service.logOrderCancelled(CONTEXT, "o1", "Client injoignable");
    expect(logs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "order.cancelled",
        targetType: "order",
        metadata: { reason: "Client injoignable" },
      })
    );
  });

  it("logs a return/defective outcome with the reason in metadata", async () => {
    await service.logOrderReturned(CONTEXT, "o1", "defective", "Produit cassé");
    expect(logs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "order.returned",
        targetType: "order",
        metadata: { outcome: "defective", reason: "Produit cassé" },
      })
    );
  });
});

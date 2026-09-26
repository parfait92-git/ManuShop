import type { Timestamp } from "firebase/firestore";

// See ProductService.test.ts: avoids loading the real Firebase SDK via the
// repositories' transitive "@/lib/firebase" import.
jest.mock("../lib/firebase", () => ({
  db: {},
}));

import { TrashService, type ITrashRepository } from "@/services/TrashService";

interface FakeItem {
  id: string;
  name: string;
  deletedAt?: Timestamp;
}

describe("TrashService", () => {
  let repo: jest.Mocked<ITrashRepository<FakeItem>>;
  let service: TrashService<FakeItem>;

  beforeEach(() => {
    repo = {
      listByShop: jest.fn(),
      softDelete: jest.fn(),
      restore: jest.fn(),
      remove: jest.fn(),
    };
    service = new TrashService(repo);
  });

  it("listTrashed keeps only items with deletedAt set", async () => {
    const active: FakeItem = { id: "1", name: "Actif" };
    const trashed: FakeItem = {
      id: "2",
      name: "À la corbeille",
      deletedAt: {} as Timestamp,
    };
    repo.listByShop.mockResolvedValue([active, trashed]);

    const result = await service.listTrashed("shop-1");

    expect(repo.listByShop).toHaveBeenCalledWith("shop-1");
    expect(result).toEqual([trashed]);
  });

  it("softDelete delegates to the repository", async () => {
    await service.softDelete("1");
    expect(repo.softDelete).toHaveBeenCalledWith("1");
  });

  it("restore delegates to the repository", async () => {
    await service.restore("1");
    expect(repo.restore).toHaveBeenCalledWith("1");
  });

  it("purge performs a permanent delete via the repository", async () => {
    await service.purge("1");
    expect(repo.remove).toHaveBeenCalledWith("1");
  });
});

jest.mock("../../services/ActivityLogService", () => ({
  activityLogService: { listRecent: jest.fn() },
}));

import { render, screen } from "@testing-library/react";
import { Timestamp } from "firebase/firestore";

import { ActivityLogPageContent } from "@/components/dashboard/ActivityLogPageContent";
import type { ActivityLogEntry } from "@/models/activity/ActivityLogEntry";
import { activityLogService } from "@/services/ActivityLogService";

const mockedService = jest.mocked(activityLogService);

function fakeEntry(overrides: Partial<ActivityLogEntry> = {}): ActivityLogEntry {
  return {
    id: "e1",
    shopId: "shop-1",
    actorId: "uid-1",
    actorName: "Ada Diallo",
    action: "product.published",
    targetType: "product",
    targetId: "p1",
    metadata: { productName: "Ensemble Wax" },
    createdAt: Timestamp.now(),
    ...overrides,
  };
}

describe("ActivityLogPageContent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows an empty state when there is no activity yet", async () => {
    mockedService.listRecent.mockResolvedValue([]);
    render(<ActivityLogPageContent shopId="shop-1" />);

    expect(
      await screen.findByText("Aucune activité pour le moment.")
    ).toBeInTheDocument();
    expect(mockedService.listRecent).toHaveBeenCalledWith("shop-1");
  });

  it("describes each entry using its action and metadata", async () => {
    mockedService.listRecent.mockResolvedValue([
      fakeEntry({
        id: "e1",
        action: "product.published",
        metadata: { productName: "Ensemble Wax" },
      }),
      fakeEntry({
        id: "e2",
        action: "category.restored",
        targetType: "category",
        metadata: { categoryName: "Mode" },
      }),
      fakeEntry({
        id: "e3",
        action: "shop.settings_updated",
        targetType: "shop",
        metadata: undefined,
      }),
    ]);
    render(<ActivityLogPageContent shopId="shop-1" />);

    expect(await screen.findByText("« Ensemble Wax » publié")).toBeInTheDocument();
    expect(screen.getByText("« Mode » restaurée")).toBeInTheDocument();
    expect(
      screen.getByText("Paramètres de la boutique mis à jour")
    ).toBeInTheDocument();
  });

  it("sorts entries by most recent first", async () => {
    mockedService.listRecent.mockResolvedValue([
      fakeEntry({
        id: "older",
        metadata: { productName: "Ancien" },
        createdAt: Timestamp.fromDate(new Date("2026-01-01T00:00:00Z")),
      }),
      fakeEntry({
        id: "newer",
        metadata: { productName: "Récent" },
        createdAt: Timestamp.fromDate(new Date("2026-06-01T00:00:00Z")),
      }),
    ]);
    render(<ActivityLogPageContent shopId="shop-1" />);

    const items = await screen.findAllByText(/publié/);
    expect(items[0]).toHaveTextContent("Récent");
    expect(items[1]).toHaveTextContent("Ancien");
  });
});

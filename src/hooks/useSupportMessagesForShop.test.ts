const unsubscribeMock = jest.fn();
const onSnapshotMock = jest.fn().mockReturnValue(unsubscribeMock);
jest.mock("firebase/firestore", () => ({
  ...jest.requireActual("firebase/firestore"),
  collection: jest.fn((_db: unknown, name: string) => ({ __collection: name })),
  onSnapshot: (...args: unknown[]) => onSnapshotMock(...args),
  query: jest.fn((...args: unknown[]) => ({ __query: args })),
  where: jest.fn((field: string, op: string, value: unknown) => ({
    field,
    op,
    value,
  })),
}));

jest.mock("../lib/firebase", () => ({ db: {} }));

import { act, renderHook, waitFor } from "@testing-library/react";
import { Timestamp } from "firebase/firestore";
import { where } from "firebase/firestore";

import { useSupportMessagesForShop } from "@/hooks/useSupportMessagesForShop";

function fakeDoc(id: string, data: Record<string, unknown>) {
  return { id, data: () => data };
}

describe("useSupportMessagesForShop", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns undefined and subscribes to nothing without a shopId", () => {
    const { result } = renderHook(() => useSupportMessagesForShop(undefined));
    expect(result.current).toBeUndefined();
    expect(onSnapshotMock).not.toHaveBeenCalled();
  });

  it("queries messages for the shop and reflects the snapshot, most recent first", async () => {
    let capturedCallback:
      | ((snapshot: { docs: unknown[] }) => void)
      | undefined;
    onSnapshotMock.mockImplementation((..._args: unknown[]) => {
      capturedCallback = _args[1] as (snapshot: { docs: unknown[] }) => void;
      return unsubscribeMock;
    });

    const { result } = renderHook(() => useSupportMessagesForShop("shop-1"));

    expect(where).toHaveBeenCalledWith("shopId", "==", "shop-1");

    act(() =>
      capturedCallback?.({
        docs: [
          fakeDoc("older", {
            subject: "Ancien",
            createdAt: Timestamp.fromDate(new Date("2026-01-01")),
          }),
          fakeDoc("newer", {
            subject: "Récent",
            createdAt: Timestamp.fromDate(new Date("2026-01-02")),
          }),
        ],
      })
    );

    await waitFor(() =>
      expect(result.current?.map((m) => m.id)).toEqual(["newer", "older"])
    );
  });

  it("falls back to an empty list when the subscription errors", async () => {
    let capturedError: ((error: unknown) => void) | undefined;
    onSnapshotMock.mockImplementation((..._args: unknown[]) => {
      capturedError = _args[2] as (error: unknown) => void;
      return unsubscribeMock;
    });

    const { result } = renderHook(() => useSupportMessagesForShop("shop-1"));

    act(() => capturedError?.(new Error("permission-denied")));

    await waitFor(() => expect(result.current).toEqual([]));
  });

  it("unsubscribes when the shopId changes or the component unmounts", () => {
    const { unmount } = renderHook(
      ({ shopId }) => useSupportMessagesForShop(shopId),
      { initialProps: { shopId: "shop-1" as string | undefined } }
    );

    unmount();

    expect(unsubscribeMock).toHaveBeenCalled();
  });
});

const unsubscribeMock = jest.fn();
const onSnapshotMock = jest.fn().mockReturnValue(unsubscribeMock);
jest.mock("firebase/firestore", () => ({
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

import { act, renderHook } from "@testing-library/react";
import { where } from "firebase/firestore";

import { useNewOrdersCount } from "@/hooks/useNewOrdersCount";

describe("useNewOrdersCount", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 0 and subscribes to nothing without a shopId", () => {
    const { result } = renderHook(() => useNewOrdersCount(undefined));
    expect(result.current).toBe(0);
    expect(onSnapshotMock).not.toHaveBeenCalled();
  });

  it("queries under_review orders for the shop and reflects the snapshot size", () => {
    let capturedCallback: ((snapshot: { size: number }) => void) | undefined;
    onSnapshotMock.mockImplementation((..._args: unknown[]) => {
      capturedCallback = _args[1] as (snapshot: { size: number }) => void;
      return unsubscribeMock;
    });

    const { result } = renderHook(() => useNewOrdersCount("shop-1"));

    expect(where).toHaveBeenCalledWith("shopId", "==", "shop-1");
    expect(where).toHaveBeenCalledWith("status", "==", "under_review");

    act(() => capturedCallback?.({ size: 3 }));

    expect(result.current).toBe(3);
  });

  it("unsubscribes when the shopId changes or the component unmounts", () => {
    const { unmount } = renderHook(
      ({ shopId }) => useNewOrdersCount(shopId),
      { initialProps: { shopId: "shop-1" } }
    );

    unmount();

    expect(unsubscribeMock).toHaveBeenCalled();
  });
});

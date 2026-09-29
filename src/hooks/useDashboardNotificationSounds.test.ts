const unsubscribePrefsMock = jest.fn();
const unsubscribeOrdersMock = jest.fn();
const unsubscribeMessagesMock = jest.fn();
const onSnapshotMock = jest.fn();
const docMock = jest.fn((...args: unknown[]) => {
  const [, collection, id] = args as [unknown, string, string];
  return { __doc: `${collection}/${id}` };
});

jest.mock("firebase/firestore", () => ({
  ...jest.requireActual("firebase/firestore"),
  collection: jest.fn((_db: unknown, name: string) => ({ __collection: name })),
  doc: (...args: unknown[]) => docMock(...args),
  onSnapshot: (...args: unknown[]) => onSnapshotMock(...args),
  query: jest.fn((...args: unknown[]) => ({ __query: args })),
  where: jest.fn((field: string, op: string, value: unknown) => ({
    field,
    op,
    value,
  })),
}));

jest.mock("../lib/firebase", () => ({ db: {} }));

const playNotificationSoundMock = jest.fn();
jest.mock("../lib/notificationSound", () => ({
  playNotificationSound: (...args: unknown[]) =>
    playNotificationSoundMock(...args),
}));

import { renderHook, act } from "@testing-library/react";

import { useDashboardNotificationSounds } from "@/hooks/useDashboardNotificationSounds";

function fakeChange(
  type: "added" | "modified" | "removed",
  id: string,
  data: Record<string, unknown>
) {
  return { type, doc: { id, data: () => data } };
}

function fakeSnapshot(changes: ReturnType<typeof fakeChange>[]) {
  return { docChanges: () => changes };
}

describe("useDashboardNotificationSounds", () => {
  let prefsCallback: ((snap: { data: () => unknown }) => void) | undefined;
  let ordersCallback: ((snap: ReturnType<typeof fakeSnapshot>) => void) | undefined;
  let messagesCallback:
    | ((snap: ReturnType<typeof fakeSnapshot>) => void)
    | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    prefsCallback = undefined;
    ordersCallback = undefined;
    messagesCallback = undefined;

    onSnapshotMock.mockImplementation((target: unknown, callback: unknown) => {
      const t = target as { __doc?: string; __query?: unknown[] };
      if (t.__doc?.startsWith("shops/")) {
        prefsCallback = callback as typeof prefsCallback;
        return unsubscribePrefsMock;
      }
      const query = t.__query as { __collection?: string }[] | undefined;
      const collectionArg = query?.[0] as { __collection?: string } | undefined;
      if (collectionArg?.__collection === "orders") {
        ordersCallback = callback as typeof ordersCallback;
        return unsubscribeOrdersMock;
      }
      messagesCallback = callback as typeof messagesCallback;
      return unsubscribeMessagesMock;
    });
  });

  it("subscribes to nothing without a shopId", () => {
    renderHook(() => useDashboardNotificationSounds(undefined));
    expect(onSnapshotMock).not.toHaveBeenCalled();
  });

  it("does not play a sound for orders/messages already present at mount (first snapshot)", () => {
    renderHook(() => useDashboardNotificationSounds("shop-1"));

    act(() => {
      ordersCallback?.(
        fakeSnapshot([
          fakeChange("added", "o1", { status: "under_review" }),
          fakeChange("added", "o2", { status: "delivered" }),
        ])
      );
      messagesCallback?.(
        fakeSnapshot([
          fakeChange("added", "m1", { reply: { body: "déjà répondu" } }),
        ])
      );
    });

    expect(playNotificationSoundMock).not.toHaveBeenCalled();
  });

  it("plays the order sound for a genuinely new order after the initial snapshot", () => {
    renderHook(() => useDashboardNotificationSounds("shop-1"));
    act(() => ordersCallback?.(fakeSnapshot([]))); // initial, empty shop

    act(() =>
      ordersCallback?.(
        fakeSnapshot([fakeChange("added", "o3", { status: "under_review" })])
      )
    );

    expect(playNotificationSoundMock).toHaveBeenCalledWith("order");
  });

  it("plays the status-change sound only when the status actually differs", () => {
    renderHook(() => useDashboardNotificationSounds("shop-1"));
    act(() =>
      ordersCallback?.(
        fakeSnapshot([fakeChange("added", "o1", { status: "under_review" })])
      )
    );

    act(() =>
      ordersCallback?.(
        fakeSnapshot([
          fakeChange("modified", "o1", { status: "ready_for_delivery" }),
        ])
      )
    );
    expect(playNotificationSoundMock).toHaveBeenCalledWith("orderStatus");

    playNotificationSoundMock.mockClear();
    act(() =>
      ordersCallback?.(
        fakeSnapshot([
          fakeChange("modified", "o1", { status: "ready_for_delivery" }),
        ])
      )
    );
    expect(playNotificationSoundMock).not.toHaveBeenCalled();
  });

  it("plays the message sound only when a reply newly appears", () => {
    renderHook(() => useDashboardNotificationSounds("shop-1"));
    act(() =>
      messagesCallback?.(
        fakeSnapshot([fakeChange("added", "m1", { reply: undefined })])
      )
    );

    act(() =>
      messagesCallback?.(
        fakeSnapshot([
          fakeChange("modified", "m1", { reply: { body: "Réponse !" } }),
        ])
      )
    );

    expect(playNotificationSoundMock).toHaveBeenCalledWith("message");
  });

  it("respects the shop's muted preferences", () => {
    renderHook(() => useDashboardNotificationSounds("shop-1"));
    act(() =>
      prefsCallback?.({ data: () => ({ soundOnNewOrder: false }) })
    );
    act(() => ordersCallback?.(fakeSnapshot([])));

    act(() =>
      ordersCallback?.(
        fakeSnapshot([fakeChange("added", "o1", { status: "under_review" })])
      )
    );

    expect(playNotificationSoundMock).not.toHaveBeenCalled();
  });

  it("unsubscribes from all three listeners on unmount", () => {
    const { unmount } = renderHook(() =>
      useDashboardNotificationSounds("shop-1")
    );

    unmount();

    expect(unsubscribePrefsMock).toHaveBeenCalled();
    expect(unsubscribeOrdersMock).toHaveBeenCalled();
    expect(unsubscribeMessagesMock).toHaveBeenCalled();
  });
});

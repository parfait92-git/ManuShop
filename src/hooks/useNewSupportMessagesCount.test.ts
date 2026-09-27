const countOpenMessagesMock = jest.fn();
jest.mock("../services/SupportMessageService", () => ({
  supportMessageService: {
    countOpenMessages: (...args: unknown[]) => countOpenMessagesMock(...args),
  },
}));

import { act, renderHook, waitFor } from "@testing-library/react";

import { useNewSupportMessagesCount } from "@/hooks/useNewSupportMessagesCount";

describe("useNewSupportMessagesCount", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("starts at 0 and reflects the count once resolved", async () => {
    countOpenMessagesMock.mockResolvedValue(2);
    const { result } = renderHook(() => useNewSupportMessagesCount());

    expect(result.current).toBe(0);
    await waitFor(() => expect(result.current).toBe(2));
  });

  it("polls again after the interval elapses", async () => {
    countOpenMessagesMock.mockResolvedValueOnce(1).mockResolvedValueOnce(5);
    const { result } = renderHook(() => useNewSupportMessagesCount());

    await waitFor(() => expect(result.current).toBe(1));

    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });

    await waitFor(() => expect(result.current).toBe(5));
    expect(countOpenMessagesMock).toHaveBeenCalledTimes(2);
  });

  it("silently keeps the previous count when a poll fails", async () => {
    countOpenMessagesMock.mockResolvedValueOnce(2).mockRejectedValueOnce(
      new Error("boom")
    );
    const { result } = renderHook(() => useNewSupportMessagesCount());

    await waitFor(() => expect(result.current).toBe(2));

    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });

    expect(result.current).toBe(2);
  });

  it("stops polling on unmount", async () => {
    countOpenMessagesMock.mockResolvedValue(1);
    const { unmount } = renderHook(() => useNewSupportMessagesCount());

    await waitFor(() => expect(countOpenMessagesMock).toHaveBeenCalledTimes(1));
    unmount();

    await act(async () => {
      jest.advanceTimersByTime(120_000);
    });

    expect(countOpenMessagesMock).toHaveBeenCalledTimes(1);
  });
});

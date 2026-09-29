import { renderHook, waitFor } from "@testing-library/react";

import { useRedirectParam } from "./useRedirectParam";

function setSearch(search: string) {
  window.history.replaceState(null, "", `/login${search}`);
}

describe("useRedirectParam", () => {
  it("returns null/false when nothing is in the query string", async () => {
    setSearch("");
    const { result } = renderHook(() => useRedirectParam());

    await waitFor(() => expect(result.current.redirectTarget).toBeNull());
    expect(result.current.justRegistered).toBe(false);
  });

  it("reads a safe redirect target", async () => {
    setSearch("?redirect=%2Fcheckout%2Fpayment");
    const { result } = renderHook(() => useRedirectParam());

    await waitFor(() =>
      expect(result.current.redirectTarget).toBe("/checkout/payment")
    );
  });

  it("ignores an unsafe redirect target", async () => {
    setSearch("?redirect=https%3A%2F%2Fevil.example");
    const { result } = renderHook(() => useRedirectParam());

    await waitFor(() => expect(result.current.justRegistered).toBe(false));
    expect(result.current.redirectTarget).toBeNull();
  });

  it("reads justRegistered", async () => {
    setSearch("?redirect=%2Fcheckout%2Fpayment&registered=1");
    const { result } = renderHook(() => useRedirectParam());

    await waitFor(() => expect(result.current.justRegistered).toBe(true));
  });
});

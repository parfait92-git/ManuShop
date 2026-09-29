import {
  buildAuthHref,
  getRedirectParam,
  isSafeRedirectTarget,
} from "./redirectParam";

describe("isSafeRedirectTarget", () => {
  it("accepts an internal path", () => {
    expect(isSafeRedirectTarget("/checkout/payment")).toBe(true);
  });

  it("rejects a protocol-relative external URL", () => {
    expect(isSafeRedirectTarget("//evil.example")).toBe(false);
  });

  it("rejects an absolute external URL", () => {
    expect(isSafeRedirectTarget("https://evil.example")).toBe(false);
  });

  it("rejects a bare relative path without a leading slash", () => {
    expect(isSafeRedirectTarget("checkout/payment")).toBe(false);
  });
});

describe("getRedirectParam", () => {
  it("returns a safe internal target", () => {
    expect(getRedirectParam("?redirect=%2Fcheckout%2Fpayment")).toBe(
      "/checkout/payment"
    );
  });

  it("returns null when the param is absent", () => {
    expect(getRedirectParam("")).toBeNull();
  });

  it("returns null for an unsafe target rather than passing it through", () => {
    expect(getRedirectParam("?redirect=https%3A%2F%2Fevil.example")).toBeNull();
  });
});

describe("buildAuthHref", () => {
  it("returns the bare path when there is no redirect target", () => {
    expect(buildAuthHref("/login", null)).toBe("/login");
  });

  it("appends the encoded redirect target", () => {
    expect(buildAuthHref("/login", "/checkout/payment")).toBe(
      "/login?redirect=%2Fcheckout%2Fpayment"
    );
  });

  it("includes extra params alongside the redirect target", () => {
    expect(
      buildAuthHref("/login", "/checkout/payment", { registered: "1" })
    ).toBe("/login?redirect=%2Fcheckout%2Fpayment&registered=1");
  });
});

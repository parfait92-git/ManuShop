import { computeSubscriptionExpiry } from "@/lib/subscriptionPlans";

describe("computeSubscriptionExpiry", () => {
  const from = new Date("2026-01-01T00:00:00.000Z");

  it("adds 1 day for the daily plan", () => {
    expect(computeSubscriptionExpiry("daily", from).toISOString()).toBe(
      "2026-01-02T00:00:00.000Z"
    );
  });

  it("adds 7 days for the weekly plan", () => {
    expect(computeSubscriptionExpiry("weekly", from).toISOString()).toBe(
      "2026-01-08T00:00:00.000Z"
    );
  });

  it("adds 30 days for the monthly plan", () => {
    expect(computeSubscriptionExpiry("monthly", from).toISOString()).toBe(
      "2026-01-31T00:00:00.000Z"
    );
  });

  it("adds 90 days for the quarterly plan", () => {
    expect(computeSubscriptionExpiry("quarterly", from).toISOString()).toBe(
      "2026-04-01T00:00:00.000Z"
    );
  });

  it("adds 365 days for the yearly plan", () => {
    expect(computeSubscriptionExpiry("yearly", from).toISOString()).toBe(
      "2027-01-01T00:00:00.000Z"
    );
  });
});

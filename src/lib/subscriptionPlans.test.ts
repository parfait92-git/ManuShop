import {
  bestValuePlan,
  computeSubscriptionExpiry,
  monthlyEquivalent,
  savingsVsMonthly,
} from "@/lib/subscriptionPlans";

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

describe("comparaison des formules (2026-10-12)", () => {
  const prices = { daily: 500, weekly: 2500, monthly: 8000, quarterly: 20000, yearly: 60000 };

  it("brings each plan back to a monthly price", () => {
    expect(monthlyEquivalent("yearly", 60000)).toBe(5000);
    expect(monthlyEquivalent("quarterly", 20000)).toBe(6667);
    expect(monthlyEquivalent("weekly", 2500)).toBe(10833);
    expect(monthlyEquivalent("daily", 500)).toBe(15208);
  });

  it("shows the saving against the monthly plan, never overstated", () => {
    expect(savingsVsMonthly("yearly", 60000, 8000)).toBe(37);
    expect(savingsVsMonthly("quarterly", 20000, 8000)).toBe(16);
    expect(savingsVsMonthly("daily", 500, 8000)).toBe(0);
    expect(savingsVsMonthly("monthly", 8000, 8000)).toBe(0);
  });

  it("picks the best value from the actual prices", () => {
    expect(bestValuePlan(prices)).toBe("yearly");
    expect(bestValuePlan({ ...prices, quarterly: 9000 })).toBe("quarterly");
  });
});

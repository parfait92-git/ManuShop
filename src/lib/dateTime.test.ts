import { formatDateTime } from "./dateTime";

describe("formatDateTime", () => {
  // 20:40 UTC = 21:40 au Cameroun (UTC+1).
  const date = new Date("2026-10-03T20:40:00Z");

  it("shows the date and the time, in Cameroon time", () => {
    expect(formatDateTime(date)).toBe("3 oct. 2026 à 21:40");
    expect(formatDateTime(date, "long")).toBe("3 octobre 2026 à 21:40");
  });
});

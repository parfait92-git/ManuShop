import { getTimeParts, pad2 } from "./countdown";

describe("getTimeParts", () => {
  it("returns zeros when the target is in the past", () => {
    expect(getTimeParts(1_000, 2_000)).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      expired: true,
    });
  });

  it("splits a remaining duration into days, hours, minutes and seconds", () => {
    const twoDays = 2 * 86_400_000;
    const sevenHours = 7 * 3_600_000;
    const thirtyFourMinutes = 34 * 60_000;
    const twentySevenSeconds = 27_000;

    expect(
      getTimeParts(
        twoDays + sevenHours + thirtyFourMinutes + twentySevenSeconds,
        0
      )
    ).toEqual({
      days: 2,
      hours: 7,
      minutes: 34,
      seconds: 27,
      expired: false,
    });
  });
});

describe("pad2", () => {
  it("pads single digits", () => {
    expect(pad2(7)).toBe("07");
  });

  it("keeps two-digit values", () => {
    expect(pad2(12)).toBe("12");
  });
});

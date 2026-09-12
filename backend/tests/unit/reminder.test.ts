import { describe, it, expect } from "vitest";
import { minusMinutes } from "../../src/services/reminder.service";

describe("minusMinutes (five-minute reminder window)", () => {
  it("subtracts 5 minutes from a class start time", () => {
    expect(minusMinutes("10:00", 5)).toBe("09:55");
  });

  it("handles the hour rollover correctly", () => {
    expect(minusMinutes("09:03", 5)).toBe("08:58");
  });

  it("returns null instead of a negative time for classes too early to reminder", () => {
    expect(minusMinutes("00:02", 5)).toBeNull();
  });

  it("pads single-digit hours and minutes with a leading zero", () => {
    expect(minusMinutes("09:04", 1)).toBe("09:03");
  });
});

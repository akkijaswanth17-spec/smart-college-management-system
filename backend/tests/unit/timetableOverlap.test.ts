import { describe, it, expect } from "vitest";
import { overlaps } from "../../src/services/timetable.service";

describe("timetable overlap detection", () => {
  it("detects a full overlap", () => {
    expect(overlaps("10:00", "11:00", "10:00", "11:00")).toBe(true);
  });

  it("detects a partial overlap", () => {
    expect(overlaps("10:00", "11:00", "10:30", "11:30")).toBe(true);
  });

  it("does not flag back-to-back classes as conflicting", () => {
    expect(overlaps("10:00", "11:00", "11:00", "12:00")).toBe(false);
  });

  it("does not flag classes on entirely different times", () => {
    expect(overlaps("09:00", "10:00", "14:00", "15:00")).toBe(false);
  });

  it("detects one class fully containing another", () => {
    expect(overlaps("09:00", "12:00", "10:00", "11:00")).toBe(true);
  });
});

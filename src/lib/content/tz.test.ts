import { describe, it, expect } from "vitest";
import {
  toTashkentInput,
  toTashkentDisplay,
  fromTashkent,
  tashkentDateTimeToUtc,
  tashkentDayOfMonth,
  tashkentMonthStartUtc,
} from "./tz";

describe("Asia/Tashkent time helpers (UTC+5, no DST)", () => {
  it("plan date+time 10:00 Tashkent → 05:00 UTC", () => {
    expect(tashkentDateTimeToUtc("2026-09-11", "10:00")).toBe("2026-09-11T05:00:00.000Z");
  });

  it("12:00 Tashkent → 07:00 UTC", () => {
    expect(tashkentDateTimeToUtc("2026-09-13", "12:00")).toBe("2026-09-13T07:00:00.000Z");
  });

  it("UTC → Tashkent input string adds 5h", () => {
    expect(toTashkentInput("2026-09-11T05:00:00.000Z")).toBe("2026-09-11T10:00");
    expect(toTashkentDisplay("2026-09-11T05:00:00.000Z")).toBe("2026-09-11 10:00");
  });

  it("round-trips Tashkent input → UTC → input", () => {
    const local = "2026-09-30T19:00";
    expect(toTashkentInput(fromTashkent(local))).toBe(local);
  });

  it("crosses the day boundary correctly (02:00 Tashkent = previous UTC day)", () => {
    expect(fromTashkent("2026-09-05T02:00")).toBe("2026-09-04T21:00:00.000Z");
    expect(tashkentDayOfMonth("2026-09-04T21:00:00.000Z")).toBe(5);
  });

  it("Tashkent month start is the previous UTC day at 19:00Z", () => {
    expect(tashkentMonthStartUtc(2026, 9)).toBe("2026-08-31T19:00:00.000Z");
  });

  it("empty / null inputs are safe", () => {
    expect(toTashkentInput(null)).toBe("");
    expect(toTashkentInput(undefined)).toBe("");
    expect(toTashkentDisplay(null)).toBe("");
  });

  it("rejects malformed datetime", () => {
    expect(() => fromTashkent("not-a-date")).toThrow();
  });
});

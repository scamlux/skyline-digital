import { describe, expect, it } from "vitest";
import { percentileBelow } from "./store";

describe("percentileBelow", () => {
  it("is the share of peers strictly below", () => {
    expect(percentileBelow(70, [50, 60, 70, 80])).toBe(50);
    expect(percentileBelow(90, [])).toBe(0);
  });
});

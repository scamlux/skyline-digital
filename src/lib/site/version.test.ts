import { describe, expect, it } from "vitest";
import {
  BRAND_ACCENTS,
  BRAND_ACCENT_KEYS,
  parseBrandAccent,
  parseSiteVersion,
  resolveVariant,
} from "./version";

describe("site version", () => {
  it("принимает только известные версии, остальное → old", () => {
    expect(parseSiteVersion("studio")).toBe("studio");
    expect(parseSiteVersion("ref")).toBe("ref");
    expect(parseSiteVersion("old")).toBe("old");
    for (const bad of ["Studio", "", null, undefined, 1, { v: "ref" }, "reference"]) {
      expect(parseSiteVersion(bad)).toBe("old");
    }
  });

  it("акцент: неизвестное → dark-blue; пресеты совпадают с эталоном", () => {
    expect(parseBrandAccent("brass")).toBe("brass");
    expect(parseBrandAccent("navy")).toBe("dark-blue");
    expect(BRAND_ACCENT_KEYS).toEqual(["dark-blue", "burgundy", "khaki", "dark-green", "brass"]);
    expect(BRAND_ACCENTS["dark-blue"]).toMatchObject({ acc: "#27406b", ink: "#8fa6cf" });
  });

  it("страница без запрошенного варианта целиком уходит в old", () => {
    const onlyOld = { old: true };
    expect(resolveVariant("studio", onlyOld)).toBe("old");
    expect(resolveVariant("ref", onlyOld)).toBe("old");
    expect(resolveVariant("studio", { old: true, studio: true })).toBe("studio");
  });
});

import { describe, expect, it } from "vitest";
import { priceParts, priceText, visitsText } from "./format";

const w = { free: "Бесплатно", upTo: "до" };

describe("форматирование цен", () => {
  it("крупные цифры: тысячи и миллионы, шкала по верхней границе", () => {
    expect(priceParts(250_000, 450_000, "ru", w)).toEqual({ num: "250–450", unit: "тыс сум" });
    expect(priceParts(4_500_000, 9_000_000, "ru", w)).toEqual({ num: "4,5–9", unit: "млн сум" });
    expect(priceParts(500_000, 1_200_000, "en", w)).toEqual({ num: "500–1\u00a0200", unit: "k UZS" });
    expect(priceParts(900_000, 2_000_000, "ru", w)).toEqual({ num: "0,9–2", unit: "млн сум" });
    expect(priceParts(0, 450_000, "uz", w)).toEqual({ num: "до 450", unit: "ming soʻm" });
    expect(priceParts(0, 0, "ru", w)).toEqual({ num: "Бесплатно", unit: "" });
  });

  it("текстовая цена и визиты", () => {
    expect(priceText(0, 0, "ru", w)).toBe("Бесплатно");
    expect(priceText(0, 450_000, "ru", w).replace(/\u00a0/g, " ")).toBe("до 450 000 сум");
    expect(visitsText(1, 2, "визита")).toBe("1–2 визита");
    expect(visitsText(3, 3, "визита")).toBe("3 визита");
  });
});

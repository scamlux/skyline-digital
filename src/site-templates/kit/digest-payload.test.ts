import { describe, expect, it } from "vitest";
import { LOCALES } from "../types";
import {
  DIGEST_FIELDS,
  START_PAYLOAD_MAX_LENGTH,
  decodeDigest,
  digestDeepLink,
  encodeDigest,
  itemCode,
  maskToWeekdays,
  normalizeBotUsername,
  weekdaysToMask,
  type DigestPayload,
  type DigestTemplate,
} from "./digest-payload";

const TEMPLATES = Object.keys(DIGEST_FIELDS) as DigestTemplate[];

/** Нагрузка шаблона, где каждое поле = f(max поля). */
function payloadOf(tpl: DigestTemplate, locale: "ru" | "en" | "uz", pick: (max: number, i: number) => number, style: "a" | "b" = "a"): DigestPayload {
  const values = Object.fromEntries(Object.entries(DIGEST_FIELDS[tpl]).map(([k, max], i) => [k, pick(max, i)]));
  return { tpl, locale, style, period: "week", values } as DigestPayload;
}

describe("нагрузка deep-ссылки сводки", () => {
  it.each(TEMPLATES)("%s: туда-обратно для всех языков и стилей", (tpl) => {
    for (const locale of LOCALES) {
      for (const style of ["a", "b"] as const) {
        const p = payloadOf(tpl, locale, (max, i) => Math.floor((max * (i + 1)) / 9), style);
        expect(decodeDigest(encodeDigest(p))).toEqual(p);
      }
    }
  });

  it.each(TEMPLATES)("%s: максимальные числа укладываются в 64 символа Telegram", (tpl) => {
    const encoded = encodeDigest(payloadOf(tpl, "uz", (max) => max, "b"));
    expect(encoded.length).toBeLessThanOrEqual(START_PAYLOAD_MAX_LENGTH);
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeDigest(encoded)).not.toBeNull();
  });

  it.each(TEMPLATES)("%s: нули тоже кодируются и разбираются", (tpl) => {
    const p = payloadOf(tpl, "ru", () => 0);
    expect(decodeDigest(encodeDigest(p))).toEqual(p);
  });

  it("зажимает значения вне границ при кодировании", () => {
    const p = payloadOf("cafe", "en", () => 0);
    const wild = { ...p, values: { orders: -5, revenue: 1e15, avg: Number.NaN, views: 12.6, drink: 999 } } as DigestPayload;
    const back = decodeDigest(encodeDigest(wild));
    expect(back?.values).toEqual({ orders: 0, revenue: DIGEST_FIELDS.cafe.revenue, avg: 0, views: 13, drink: DIGEST_FIELDS.cafe.drink });
  });

  it("формат v1 зафиксирован: заголовок «1 шаблон язык стиль период»", () => {
    const encoded = encodeDigest({ tpl: "restaurant", locale: "ru", style: "a", period: "week", values: { leads: 12, calls: 8, telegram: 5, views: 320, peak: 0b0010100 } });
    expect(encoded).toBe("1rraw-c-8-5-8w-k");
  });

  it.each([
    ["пусто", ""],
    ["не та версия", "2rraw-c-8-5-8w-k"],
    ["неизвестный шаблон", "1xraw-c-8-5-8w-k"],
    ["неизвестный язык", "1rxaw-c-8-5-8w-k"],
    ["неизвестный стиль", "1rrcw-c-8-5-8w-k"],
    ["неизвестный период", "1rrax-c-8-5-8w-k"],
    ["не хватает полей", "1rraw-c-8-5-8w"],
    ["лишнее поле", "1rraw-c-8-5-8w-k-1"],
    ["заглавные в числе", "1rraw-C-8-5-8w-k"],
    ["посторонний символ", "1rraw-c-8-5-8w-k!"],
    ["пустое поле", "1rraw--8-5-8w-k"],
    ["число длиннее 8 знаков", "1rraw-zzzzzzzzz-8-5-8w-k"],
    ["счётчик выше границы", "1rraw-zzzz-8-5-8w-k"],
    ["маска дней выше 127", "1rraw-c-8-5-8w-3k"],
  ])("отклоняет: %s", (_name, raw) => {
    expect(decodeDigest(raw)).toBeNull();
  });

  it("отклоняет не строки и строки длиннее 64 символов", () => {
    expect(decodeDigest(undefined)).toBeNull();
    expect(decodeDigest(42)).toBeNull();
    expect(decodeDigest(`1rraw-${"0-".repeat(40)}0`)).toBeNull();
  });

  it("маска дней недели и код позиции", () => {
    expect(maskToWeekdays(weekdaysToMask([0, 4, 6]))).toEqual([0, 4, 6]);
    expect(weekdaysToMask([-1, 7, 2])).toBe(0b100);
    expect(itemCode(-1)).toBe(0);
    expect(itemCode(0)).toBe(1);
    expect(itemCode(DIGEST_FIELDS.clinic.svc)).toBe(0);
  });

  it("имя бота: срезает @, отсекает мусор", () => {
    expect(normalizeBotUsername("@skyline_demo_bot")).toBe("skyline_demo_bot");
    expect(normalizeBotUsername(" skyline_demo_bot ")).toBe("skyline_demo_bot");
    expect(normalizeBotUsername("bad name")).toBeUndefined();
    expect(normalizeBotUsername("abc")).toBeUndefined();
    expect(normalizeBotUsername("1abcdef")).toBeUndefined();
    expect(normalizeBotUsername("a/b?c=d_bot")).toBeUndefined();
    expect(normalizeBotUsername(undefined)).toBeUndefined();
  });

  it("deep-ссылка ведёт на t.me с ?start=", () => {
    const p = payloadOf("clinic", "en", () => 1);
    expect(digestDeepLink("skyline_demo_bot", p)).toBe(`https://t.me/skyline_demo_bot?start=${encodeDigest(p)}`);
  });
});

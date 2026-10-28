import { describe, expect, it } from "vitest";
import { restaurantDemo } from "./restaurant/data";
import { restaurantUi } from "./restaurant/ui";
import { TEMPLATES } from "./registry";
import { formatSum, LOCALES, STYLE_IDS, type L } from "./types";

/** Собирает все строки-на-трёх-языках из объекта (данные и тексты интерфейса). */
function collect(node: unknown, path: string, out: { path: string; l: L }[]) {
  if (!node || typeof node !== "object") return;
  const o = node as Record<string, unknown>;
  if (typeof o.ru === "string" && typeof o.en === "string" && typeof o.uz === "string") {
    out.push({ path, l: o as unknown as L });
    return;
  }
  for (const [k, v] of Object.entries(o)) collect(v, `${path}.${k}`, out);
}

describe("шаблоны: тексты на трёх языках", () => {
  const all: { path: string; l: L }[] = [];
  collect(restaurantDemo, "data", all);
  collect(restaurantUi, "ui", all);
  // Названия, описания и настроения стилей из реестра тоже видны посетителям витрины.
  collect(
    TEMPLATES.map((t) => ({ title: t.title, blurb: t.blurb, styles: t.styles.map((s) => ({ name: s.name, mood: s.mood })) })),
    "registry",
    all,
  );

  it("нашлись строки для проверки", () => {
    expect(all.length).toBeGreaterThan(60);
  });

  it.each(all.map((a) => [a.path, a.l] as const))("%s: заполнены ru/en/uz", (_p, l) => {
    for (const loc of LOCALES) expect(l[loc].trim().length).toBeGreaterThan(0);
  });

  it("узбекский: нет «‘», «’» и «'» вместо ʻ (U+02BB)", () => {
    const bad = all.filter((a) => /[‘’'`]/.test(a.l.uz)).map((a) => a.path);
    expect(bad).toEqual([]);
  });
});

describe("шаблон «Ресторан»: данные", () => {
  it("в каждой категории есть блюда, цены положительные", () => {
    for (const c of restaurantDemo.menu) {
      expect(c.items.length).toBeGreaterThan(0);
      for (const it of c.items) expect(it.price).toBeGreaterThan(0);
    }
  });

  it("часы работы в формате HH:MM", () => {
    expect(restaurantDemo.hours.open).toMatch(/^\d{2}:\d{2}$/);
    expect(restaurantDemo.hours.close).toMatch(/^\d{2}:\d{2}$/);
  });

  it("есть позиция в стоп-листе (демонстрация)", () => {
    expect(restaurantDemo.menu.flatMap((c) => c.items).some((i) => i.available === false)).toBe(true);
  });
});

describe("шаблон «Ресторан»: подстановки в тексты", () => {
  it("«открыто/закроется» содержат {t} на всех языках (время подставляется в браузере)", () => {
    for (const loc of LOCALES) {
      expect(restaurantUi.openNow[loc]).toContain("{t}");
      expect(restaurantUi.closedNow[loc]).toContain("{t}");
    }
  });
});

describe("formatSum", () => {
  it("группирует разряды неразрывным пробелом и добавляет валюту по языку", () => {
    expect(formatSum(65000, "ru")).toBe("65 000 сум");
    expect(formatSum(1250000, "en")).toBe("1 250 000 UZS");
    expect(formatSum(8000, "uz")).toBe("8 000 soʻm");
  });
});

describe("реестр шаблонов", () => {
  it("у каждого шаблона два стиля a/b и уникальный id", () => {
    const ids = TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of TEMPLATES) expect(t.styles.map((s) => s.id)).toEqual(STYLE_IDS);
  });
});

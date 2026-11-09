import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { normalizeClientContent, ratingText } from "./kit/client-config";
import { CafeSite } from "./cafe/Cafe";
import { cafeDemo } from "./cafe/data";
import { ClinicSite } from "./clinic/Clinic";
import { clinicDemo } from "./clinic/data";
import { RestaurantSite } from "./restaurant/Restaurant";
import { restaurantDemo } from "./restaurant/data";
import { salonBusinesses } from "./salon/data";
import { SalonSite } from "./salon/Salon";
import { LOCALES, type ClientContent, type Locale, type SiteMode, type StyleId } from "./types";

const hrefs = { ru: "/", en: "/en/", uz: "/uz/" };
/** Демо-пометки, которых на сайте клиента быть не должно (маска из ТЗ экспорта). */
const DEMO_TEXT = /демо|demo|вымышлен|fictional|xayoliy/i;
const EMPTY: ClientContent = { reviews: [], stats: [] };

interface Case {
  name: string;
  render: (p: { locale: Locale; mode: SiteMode; client?: ClientContent; style?: StyleId }) => string;
}

/**
 * Данные в том виде, в каком их получает сайт клиента: как их готовит экспорт (scripts/export-template.mjs):
 * пометки «(демо…)» в скобках убраны из копии data.ts, Telegram переопределён site.config.ts.
 */
function asClient<T extends { telegram: string }>(demo: T): T {
  return { ...(JSON.parse(JSON.stringify(demo).replace(/\s*\((?:демо|demo)[^)]*\)/gi, "")) as T), telegram: "client_handle" };
}

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);

const CASES: Case[] = [
  { name: "ресторан", render: ({ locale, mode, client, style = "a" }) => html(createElement(RestaurantSite, { data: asClient(restaurantDemo), locale, style, localeHrefs: hrefs, mode, client })) },
  { name: "клиника", render: ({ locale, mode, client, style = "a" }) => html(createElement(ClinicSite, { data: asClient(clinicDemo), locale, style, localeHrefs: hrefs, mode, client })) },
  { name: "барбершоп", render: ({ locale, mode, client }) => html(createElement(SalonSite, { data: asClient(salonBusinesses.a), locale, style: "a", localeHrefs: hrefs, mode, client })) },
  { name: "салон красоты", render: ({ locale, mode, client }) => html(createElement(SalonSite, { data: asClient(salonBusinesses.b), locale, style: "b", localeHrefs: hrefs, mode, client })) },
  { name: "кафе", render: ({ locale, mode, client, style = "a" }) => html(createElement(CafeSite, { data: asClient(cafeDemo), locale, style, localeHrefs: hrefs, mode, client })) },
];

/** Всё, что видит гость или читает экранный диктор: текст без тегов и значения aria-label/alt/title. */
function visibleText(markup: string): string {
  const attrs = [...markup.matchAll(/\s(?:aria-label|alt|title|placeholder)="([^"]*)"/g)].map((m) => m[1]);
  const body = markup.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ");
  return [body.replace(/<[^>]+>/g, " "), ...attrs].join("\n");
}

const REAL: ClientContent = normalizeClientContent({
  reviews: [
    { author: "Анвар Тестов", text: "Настоящий отзыв номер один", url: "https://maps.example/review/1" },
    { author: "Лола Проверкина", text: { ru: "Отзыв на русском", en: "Review in English", uz: "Oʻzbekcha fikr" } },
  ],
  rating: { value: 4.7, count: 58, source: "Google Maps", url: "https://maps.example/place" },
  stats: [{ value: "9 лет", label: "с вами" }],
  promo: "Настоящая акция недели",
});

describe.each(CASES)("клиентский режим: $name", ({ render }) => {
  it.each(LOCALES)("без контента клиента: ни демо-пометок, ни отзывов, ни звёзд, ни цифр (%s)", (locale) => {
    const markup = render({ locale, mode: "client", client: EMPTY });
    expect(visibleText(markup)).not.toMatch(DEMO_TEXT);
    expect(markup).not.toMatch(/id="reviews"|class="[^"]*-reviews[^"]*"|class="[^"]*-review"/);
    expect(markup).not.toMatch(/class="[^"]*-stars/);
    expect(markup).not.toMatch(/class="[^"]*(rs-facts|cl-stats)/);
    expect(markup).not.toMatch(/class="[^"]*(-promo)/);
  });

  it("без объекта client вымышленное из данных всё равно не показывается", () => {
    const markup = render({ locale: "ru", mode: "client" });
    expect(visibleText(markup)).not.toMatch(DEMO_TEXT);
    expect(markup).not.toMatch(/-reviews|-stars/);
  });

  it("настоящие отзывы, оценка и цифры показываются без демо-пометок и без звёзд", () => {
    const markup = render({ locale: "ru", mode: "client", client: REAL });
    const text = visibleText(markup);
    expect(text).toContain("Анвар Тестов");
    expect(text).toContain("Настоящий отзыв номер один");
    expect(text).toContain("Лола Проверкина");
    expect(text).toContain("Отзыв на русском");
    expect(text).toContain("4,7 из 5 · 58 отзывов · Google Maps");
    expect(markup).toContain('href="https://maps.example/review/1"');
    expect(markup).toContain('href="https://maps.example/place"');
    expect(markup).toContain("Настоящая акция недели");
    expect(text).not.toMatch(DEMO_TEXT);
    expect(markup).not.toMatch(/class="[^"]*-stars/);
  });

  it("настоящий отзыв на нужном языке", () => {
    expect(render({ locale: "en", mode: "client", client: REAL })).toContain("Review in English");
    expect(render({ locale: "uz", mode: "client", client: REAL })).toContain("Oʻzbekcha fikr");
  });

  it("режим demo (по умолчанию для студии) не изменился: вымышленные отзывы и пометки на месте", () => {
    const markup = render({ locale: "ru", mode: "demo" });
    expect(visibleText(markup)).toMatch(DEMO_TEXT);
    expect(markup).toMatch(/-reviews|id="reviews"/);
    expect(markup).toMatch(/-stars/);
  });
});

describe("normalizeClientContent", () => {
  it("строка текста раскладывается на три языка, пустые записи отбрасываются", () => {
    const c = normalizeClientContent({
      reviews: [
        { author: " Мария ", text: "Хорошо" },
        { author: "", text: "без автора" },
        { author: "Без текста", text: "  " },
      ],
      stats: [
        { value: "5", label: "лет" },
        { value: "", label: "пусто" },
      ],
      promo: "  ",
    });
    expect(c.reviews).toEqual([{ name: "Мария", text: { ru: "Хорошо", en: "Хорошо", uz: "Хорошо" }, url: undefined }]);
    expect(c.stats).toEqual([{ value: "5", label: { ru: "лет", en: "лет", uz: "лет" } }]);
    expect(c.promo).toBeUndefined();
    expect(c.rating).toBeUndefined();
  });

  it("неверная оценка — ошибка, а не молчаливая подстановка", () => {
    expect(() => normalizeClientContent({ rating: { value: 5.5, count: 3, source: "Google" } })).toThrow(/rating/);
    expect(() => normalizeClientContent({ rating: { value: 4.5, count: 0, source: "Google" } })).toThrow(/rating/);
    expect(() => normalizeClientContent({ rating: { value: 4.5, count: 3, source: " " } })).toThrow(/rating/);
  });

  it("ratingText: разделитель и склонение по языку", () => {
    expect(ratingText({ value: 4.9, count: 1, source: "2ГИС" }, "ru")).toBe("4,9 из 5 · 1 отзыв · 2ГИС");
    expect(ratingText({ value: 4.9, count: 3, source: "2ГИС" }, "ru")).toBe("4,9 из 5 · 3 отзыва · 2ГИС");
    expect(ratingText({ value: 5, count: 12, source: "2ГИС" }, "ru")).toBe("5 из 5 · 12 отзывов · 2ГИС");
    expect(ratingText({ value: 4.5, count: 2, source: "Google" }, "en")).toBe("4.5 out of 5 · 2 reviews · Google");
    expect(ratingText({ value: 4.5, count: 2, source: "Google" }, "uz")).toBe("5 dan 4,5 · 2 ta fikr · Google");
  });
});

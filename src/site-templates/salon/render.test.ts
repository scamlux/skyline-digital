import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LOCALES, type StyleId } from "../types";
import { salonBusinesses } from "./data";
import { SalonSite } from "./Salon";

const hrefs = { ru: "/", en: "/en", uz: "/uz" };
const STYLES: StyleId[] = ["a", "b"];

/** Текст заголовка h1 из готовой разметки: теги убраны, пробелы схлопнуты. */
function headlineOf(html: string): string {
  const inner = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html)?.[1] ?? "";
  return inner.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

describe("шаблон «Салон»: разметка страницы", () => {
  it.each(STYLES.flatMap((style) => LOCALES.map((locale) => [style, locale] as const)))("стиль %s, %s: h1 равен строке из данных, секции и одна кнопка hero на месте", (style, locale) => {
    const data = salonBusinesses[style];
    const html = renderToStaticMarkup(createElement(SalonSite, { data, locale, style, localeHrefs: hrefs }));
    const expected = `${data.hero.line1[locale]} ${data.hero.line2[locale]}`;
    expect(headlineOf(html)).toBe(expected);
    expect(/<h1[^>]*aria-label="([^"]*)"/.exec(html)?.[1]).toBe(expected);
    expect(html.match(/<h1/g)).toHaveLength(1);
    // Ровно одна главная кнопка hero, и она помечена для наблюдателя (шапка и нижняя панель прячутся, пока она видна).
    expect(html.match(/id="hero-cta"/g)).toHaveLength(1);
    for (const id of ["looks", "services", "quiz", "masters", "place", "reviews", "faq", "contacts"]) expect(html).toContain(`id="${id}"`);
    expect(html).toContain(`data-style="${style}"`);
  });

  it("мужской и женский сайт различаются названием, шрифтом заголовка и фото первого экрана", () => {
    const render = (style: StyleId) => renderToStaticMarkup(createElement(SalonSite, { data: salonBusinesses[style], locale: "ru", style, localeHrefs: hrefs }));
    const a = render("a");
    const b = render("b");
    expect(a).toContain("USTARA");
    expect(b).toContain("Nafis");
    expect(a).toContain("oswald-cyrillic.woff2");
    expect(b).toContain("cormorant-cyrillic.woff2");
    // Заголовок на кириллице: латинский файл первому экрану не нужен и не предзагружается.
    expect(a).not.toContain("oswald-latin.woff2");
    expect(b).not.toContain("cormorant-latin.woff2");
    expect(a).toContain("/templates/salon/img/hero-1280.webp");
    expect(b).toContain("/templates/salon/img/w-hero-960.webp");
    // Шрифты, которых нет на первом экране, не предзагружаются.
    expect(a).not.toContain("cormorant");
    expect(b).not.toContain("oswald");
  });
});

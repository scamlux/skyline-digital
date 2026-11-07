import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LOCALES, type StyleId } from "../types";
import { salonDemo } from "./data";
import { SalonSite } from "./Salon";

const hrefs = { ru: "/", en: "/en", uz: "/uz" };
const STYLES: StyleId[] = ["a", "b"];

/** Текст заголовка h1 из готовой разметки: теги убраны, пробелы схлопнуты. */
function headlineOf(html: string): string {
  const inner = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html)?.[1] ?? "";
  return inner.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

describe("шаблон «Салон»: заголовок в отрендеренной разметке", () => {
  it.each(STYLES.flatMap((style) => LOCALES.map((locale) => [style, locale] as const)))("стиль %s, %s: текст h1 равен исходной строке, слова не слиплись", (style, locale) => {
    const html = renderToStaticMarkup(createElement(SalonSite, { data: salonDemo, locale, style, localeHrefs: hrefs }));
    const [l1, l2] = salonDemo.hero[style];
    const expected = `${l1[locale]} ${l2[locale]}`;
    expect(headlineOf(html)).toBe(expected);
    expect(/<h1 aria-label="([^"]*)"/.exec(html)?.[1]).toBe(expected);
    // Пробел внутри inline-block слова схлопывается в браузере («безспешки»): он должен стоять между словами.
    const h1 = /<h1[\s\S]*?<\/h1>/.exec(html)?.[0] ?? "";
    expect(h1).not.toMatch(/<\/span>\s+<\/span>/);
  });
});

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { ThemeFont } from "./types";

/**
 * Шрифты вшиваются в HTML как base64, а не тянутся из сети: рендер не должен
 * зависеть от Google Fonts (в CI молча падает на системный шрифт — заметно
 * уже в опубликованном посте). Файлы .woff2 лежат в репо рядом с модулем.
 */

const FONTS_DIR = join(process.cwd(), "src/lib/content/fonts");

const RANGES: Record<string, string> = {
  cyrillic: "U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116",
  latin:
    "U+0000-00FF,U+0131,U+2000-206F,U+2074,U+20AC,U+2122,U+2190-21BB,U+2212,U+2215",
};

const cache = new Map<string, string>();

/** CSS @font-face для набора шрифтов темы. Кэшируется на процесс. */
export function fontFaceCss(fonts: ThemeFont[]): string {
  const key = fonts.map((f) => f.slug).join("|");
  const hit = cache.get(key);
  if (hit) return hit;

  if (!existsSync(FONTS_DIR)) {
    throw new Error(`Нет папки шрифтов ${FONTS_DIR} — .woff2 должны лежать в репо`);
  }
  const files = readdirSync(FONTS_DIR).filter((f) => f.endsWith(".woff2"));
  const css = fonts
    .flatMap((font) =>
      files
        .filter((f) => f.startsWith(font.slug + "-"))
        .map((f) => {
          const m = f.match(/^(.+)-(cyrillic|latin)-(\d+)-normal\.woff2$/);
          if (!m) return "";
          const [, , subset, weight] = m;
          if (!font.weights.includes(Number(weight))) return "";
          const b64 = readFileSync(join(FONTS_DIR, f)).toString("base64");
          return `@font-face{font-family:"${font.family}";font-style:normal;font-weight:${weight};font-display:block;src:url(data:font/woff2;base64,${b64}) format("woff2");unicode-range:${RANGES[subset]};}`;
        }),
    )
    .filter(Boolean)
    .join("\n");

  if (!css) throw new Error(`Не найдено ни одного .woff2 для тем: ${key}`);
  cache.set(key, css);
  return css;
}

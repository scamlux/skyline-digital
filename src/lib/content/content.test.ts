import { describe, it, expect } from "vitest";
import { buildPost, specHash } from "./build";
import { listThemes, getTheme } from "./themes";
import { postSpecSchema } from "./types";

const SPEC = {
  slug: "test-post",
  title: "Тест",
  style: "studio",
  format: "post",
  platforms: ["telegram"],
  slides: [
    { type: "cover", title: "Сколько стоит сайт", eyebrow: "ЦЕНЫ", tone: "dark" },
    { type: "prices", items: [{ what: "Лендинг", val: "от $450" }] },
    { type: "cta", title: "Посчитайте свой", action: "калькулятор на сайте" },
  ],
  caption: { default: "Подпись поста.", threads: "Коротко #skyline" },
  hashtags: ["#вебстудия"],
};

describe("постспека и билд", () => {
  it("валидирует и собирает HTML-слайды с шрифтами", () => {
    const built = buildPost(SPEC);
    expect(built.slides).toHaveLength(3);
    expect(built.slides[0]).toContain("<!doctype html>");
    expect(built.slides[0]).toContain("@font-face");
    expect(built.slides[0]).toContain("Сколько стоит сайт");
    expect(built.captionMd).toContain("## Telegram");
  });

  it("hash детерминирован и меняется от спеки", () => {
    const a = specHash(postSpecSchema.parse(SPEC));
    const b = specHash(postSpecSchema.parse(SPEC));
    expect(a).toBe(b);
    const c = specHash(postSpecSchema.parse({ ...SPEC, format: "story" }));
    expect(c).not.toBe(a);
  });

  it("неизвестный тип слайда режется зодом", () => {
    expect(() => buildPost({ ...SPEC, slides: [{ type: "nope" }] })).toThrow();
  });

  it("тема vibe не поддерживает слайд ui", () => {
    expect(() =>
      buildPost({ ...SPEC, style: "vibe", slides: [{ type: "ui", title: "х" }] }),
    ).toThrow(/не поддерживает/);
  });
});

describe("реестр тем", () => {
  it("две темы, у каждой css/supports/palette", () => {
    const themes = listThemes();
    expect(themes.map((t) => t.key).sort()).toEqual(["studio", "vibe"]);
    for (const t of themes) {
      expect(t.css(1080, 1350)).toContain("@font-face");
      expect(t.supports.length).toBeGreaterThan(5);
    }
    expect(getTheme("unknown").key).toBe("studio"); // фолбэк
  });
});

// Правила гейта покрыты в guard.test.ts (инвариант плана + точечные правила).

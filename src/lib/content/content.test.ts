import { describe, it, expect } from "vitest";
import { buildPost, specHash } from "./build";
import { runGuard, guardBlocks } from "./guard";
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

describe("guard §3.3", () => {
  const spec = postSpecSchema.parse(SPEC);

  it("чистая спека проходит", () => {
    const issues = runGuard(spec);
    expect(guardBlocks(issues)).toBe(false);
  });

  it("чужая цена → предупреждение; с маркером «рыночная» — нет", () => {
    const bad = postSpecSchema.parse({
      ...SPEC,
      slides: [{ type: "cover", title: "Сайт за $99" }],
    });
    expect(runGuard(bad).some((i) => i.code === "price")).toBe(true);
    const ok = postSpecSchema.parse({
      ...SPEC,
      slides: [{ type: "cover", title: "Рыночная цена — $2000, у нас честнее" }],
    });
    expect(runGuard(ok).some((i) => i.code === "price")).toBe(false);
  });

  it("обещание срока → ошибка (блокирует)", () => {
    const bad = postSpecSchema.parse({
      ...SPEC,
      slides: [{ type: "cover", title: "Сделаем за 5 дней" }],
    });
    const issues = runGuard(bad);
    expect(issues.some((i) => i.code === "deadline" && i.level === "error")).toBe(true);
    expect(guardBlocks(issues)).toBe(true);
  });

  it("Lighthouse утвердительно → ошибка; «не пользуемся» — ок", () => {
    const bad = postSpecSchema.parse({ ...SPEC, slides: [{ type: "cover", title: "Проверяем Lighthouse" }] });
    expect(runGuard(bad).some((i) => i.code === "lighthouse")).toBe(true);
    const ok = postSpecSchema.parse({ ...SPEC, slides: [{ type: "cover", title: "Почему мы не пользуемся Lighthouse" }] });
    expect(runGuard(ok).some((i) => i.code === "lighthouse")).toBe(false);
  });

  it("Threads: ровно один хэштег", () => {
    const bad = postSpecSchema.parse({
      ...SPEC,
      platforms: ["threads"],
      caption: { threads: "без хэштегов" },
    });
    expect(runGuard(bad).some((i) => i.code === "threads-hashtag")).toBe(true);
  });
});

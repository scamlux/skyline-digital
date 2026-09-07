import { describe, it, expect } from "vitest";
import { runGuard, guardBlocks } from "./guard";
import { postSpecSchema } from "./types";
import { planToSpec, type ContentPlan } from "./import-plan";
import plan from "../../../docs/smm/content-plan-2026-09.json";

const PLAN = plan as unknown as ContentPlan;
const errorsOf = (spec: ReturnType<typeof postSpecSchema.parse>) =>
  runGuard(spec).filter((i) => i.level === "error");

// Базовая валидная спека для точечных проверок.
const OK = {
  slug: "ok-post",
  title: "Тест",
  platforms: ["instagram"],
  slides: [
    { type: "cover", title: "Заголовок" },
    { type: "cta", title: "Посчитайте", action: "калькулятор" },
  ],
  caption: {
    instagram: "Полезный пост. Что вы думаете? Напишите в комментариях.",
    default: "Полезный пост. Что вы думаете? Напишите в комментариях.",
  },
  hashtags: [],
};
const build = (over: Record<string, unknown>) => postSpecSchema.parse({ ...OK, ...over });

describe("QA-гейт §1.6 — инвариант плана", () => {
  it("все 13 ready-постов проходят гейт с нулём ошибок", () => {
    const ready = PLAN.posts.filter((p) => p.status === "ready");
    expect(ready.length).toBe(13);
    for (const p of ready) {
      const errs = errorsOf(planToSpec(p));
      expect(errs, `${p.id}: ${JSON.stringify(errs)}`).toEqual([]);
    }
  });
});

describe("QA-гейт §1.6 — правила", () => {
  it("базовая валидная спека не блокируется", () => {
    expect(guardBlocks(runGuard(build({})))).toBe(false);
  });

  it("наша цена «от $N» вне прайса → ошибка; из прайса — нет", () => {
    const bad = build({ slides: [{ type: "cover", title: "Сайты от $999" }, OK.slides[1]] });
    expect(errorsOf(bad).some((i) => i.code === "our-price")).toBe(true);
    const good = build({ slides: [{ type: "cover", title: "Сайты от $1 000" }, OK.slides[1]] });
    expect(errorsOf(good).some((i) => i.code === "our-price")).toBe(false);
  });

  it("рыночные/примерные цифры ($150, ~$400, около $2 580) не блокируют", () => {
    const s = build({
      slides: [{ type: "cover", title: "На рынке за $150, ~$400, у нас около $2 580" }, OK.slides[1]],
    });
    expect(errorsOf(s).some((i) => i.code === "our-price")).toBe(false);
  });

  it("нет вопроса → ошибка", () => {
    const s = build({ caption: { instagram: "Без вопроса. Напишите в комментариях.", default: "x" } });
    expect(errorsOf(s).some((i) => i.code === "no-question")).toBe(true);
  });

  it("нет призыва прокомментировать → ошибка (ключ не считается)", () => {
    const s = build({ caption: { instagram: "Вопрос? Пришлите КЕЙС в директ.", default: "x" } });
    expect(errorsOf(s).some((i) => i.code === "no-comment-cta")).toBe(true);
  });

  it("хэштеги (в поле и в тексте) → ошибка", () => {
    expect(errorsOf(build({ hashtags: ["#веб"] })).some((i) => i.code === "hashtags")).toBe(true);
    const inline = build({
      caption: { instagram: "Вопрос? Напишите в комментариях #skyline", default: "x" },
    });
    expect(errorsOf(inline).some((i) => i.code === "hashtags-inline")).toBe(true);
  });

  it("больше 10 слайдов → ошибка", () => {
    const many = Array.from({ length: 11 }, (_, i) => ({ type: "cover", title: `s${i}` }));
    expect(errorsOf(build({ slides: many })).some((i) => i.code === "slides-count")).toBe(true);
  });

  it("пустая подпись для площадки из platforms → ошибка", () => {
    const s = build({ platforms: ["instagram", "telegram"], caption: { instagram: "Вопрос? Напишите в комментариях.", telegram: "" } });
    // telegram пустой, но есть фолбэк на default? тут default нет → ошибка
    expect(errorsOf(s).some((i) => i.code === "caption-empty")).toBe(true);
  });

  it("Lighthouse утвердительно → ошибка; «не пользуемся» — ок", () => {
    const bad = build({ slides: [{ type: "cover", title: "Проверяем Lighthouse" }, OK.slides[1]] });
    expect(errorsOf(bad).some((i) => i.code === "lighthouse")).toBe(true);
    const ok = build({ slides: [{ type: "cover", title: "Мы не пользуемся Lighthouse" }, OK.slides[1]] });
    expect(errorsOf(ok).some((i) => i.code === "lighthouse")).toBe(false);
  });

  it("предупреждения не блокируют: длинная TG-подпись и последний слайд не cta", () => {
    const s = build({
      slides: [{ type: "cover", title: "A" }, { type: "take", text: "Мысль" }],
      caption: {
        instagram: "Вопрос? Напишите в комментариях.",
        default: "Вопрос? Напишите в комментариях.",
        telegram: "x".repeat(1100),
      },
    });
    const issues = runGuard(s);
    expect(issues.some((i) => i.code === "tg-length" && i.level === "warning")).toBe(true);
    expect(issues.some((i) => i.code === "last-not-cta" && i.level === "warning")).toBe(true);
    expect(guardBlocks(issues)).toBe(false);
  });
});

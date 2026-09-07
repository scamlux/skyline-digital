import { describe, it, expect } from "vitest";
import { planToSpec, mapPlanStatus, type ContentPlan, type PlanPost } from "./import-plan";
import plan from "../../../docs/smm/content-plan-2026-09.json";

const PLAN = plan as unknown as ContentPlan;

describe("importer: план → postSpecSchema", () => {
  it("все 16 постов проходят маппинг и zod без ошибок", () => {
    for (const p of PLAN.posts) {
      expect(() => planToSpec(p), `пост ${p.id}`).not.toThrow();
    }
    expect(PLAN.posts.length).toBe(16);
  });

  it("статусы плана маппятся, но никогда в approved", () => {
    expect(mapPlanStatus("ready")).toBe("review");
    expect(mapPlanStatus("draft")).toBe("draft");
    expect(mapPlanStatus("blocked")).toBe("blocked");
    expect(mapPlanStatus(undefined)).toBe("draft");
    for (const s of ["ready", "draft", "blocked", "whatever", undefined]) {
      expect(mapPlanStatus(s as string)).not.toBe("approved");
    }
  });

  it("ремап полей: points t/d→title/text, word l1..l3→line1..3, prices rows→items, cover sub→subtitle", () => {
    const razbor = planToSpec(PLAN.posts.find((p) => p.id === "w1-razbor-kofeynya")!);
    const points = razbor.slides.find((s) => s.type === "points") as {
      items: { n?: string; title: string; text?: string }[];
    };
    expect(points.items[0].title).toBe("Меню картинкой");
    expect(points.items[0].n).toBe("01");
    expect(points.items[0].text).toMatch(/не читается/);

    const cena = planToSpec(PLAN.posts.find((p) => p.id === "w1-cena-sajt")!);
    const word = cena.slides.find((s) => s.type === "word") as {
      line1?: string;
      line2: string;
      line3?: string;
    };
    expect(word.line2).toBe("ОТ $1 000");
    expect(word.line1).toBe("ПОЧЕМУ У НАС");

    const prices = cena.slides.find((s) => s.type === "prices") as {
      items: { what: string; val: string }[];
    };
    expect(prices.items[0]).toEqual({ what: "Шаблон на конструкторе", val: "~$150" });

    const radar = planToSpec(PLAN.posts.find((p) => p.id === "w1-radar-ai")!);
    const cover = radar.slides.find((s) => s.type === "cover") as { subtitle?: string };
    expect(cover.subtitle).toMatch(/за что просят денег/);
  });

  it("caption_instagram → caption.instagram И caption.default; facebook принят как площадка", () => {
    const s = planToSpec(PLAN.posts[0]);
    expect(s.caption.default).toBe(s.caption.instagram);
    expect((s.caption.instagram ?? "").length).toBeGreaterThan(0);
    expect(s.platforms).toContain("facebook");
    expect(s.platforms).toContain("instagram");
  });

  it("одиночный кадр (20.09) остаётся одним слайдом", () => {
    const one = planToSpec(PLAN.posts.find((p) => p.id === "w2-vibe-claude-gpt")!);
    expect(one.slides.length).toBe(1);
    expect(one.slides[0].type).toBe("take");
  });

  it("неизвестный тип слайда → внятная ошибка", () => {
    const bad: PlanPost = {
      id: "bad-post",
      date: "2026-09-07",
      title: "x",
      slides: [{ t: "quantum" }],
      caption_instagram: "?",
    };
    expect(() => planToSpec(bad)).toThrow(/quantum/);
  });
});

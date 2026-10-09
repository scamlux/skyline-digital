import { describe, it, expect } from "vitest";
import { computePricing } from "@/lib/pricing";
import { prefilter } from "./prefilter";
import { quoteFor } from "./quote";
import { heuristicQualification, sanitizeQualification, type Qualification } from "./qualify";
import { templateDraft } from "./draft";
import { ACTION_STATUS, formatCard, formatDraftMessage, keyboardFor, parseCallback } from "./card";
import { dueRoutines, periodKey, ROUTINES } from "./routines";
import { fingerprint } from "./fingerprint";
import { fallbackExtract } from "./ai";
import { readPipelineConfig } from "./config";
import type { OpportunityRow, RawOpportunity } from "./types";

const NOW = new Date("2026-10-09T06:00:00Z");

const raw = (over: Partial<RawOpportunity> = {}): RawOpportunity => ({
  source: "reddit",
  externalId: "x",
  url: "https://example.org/x",
  title: "[Hiring] Next.js developer for e-commerce website",
  description: "Online store with Stripe, admin panel. Budget $2,500.",
  publishedAt: "2026-10-08T00:00:00Z",
  ...over,
});

describe("prefilter", () => {
  it("passes a web project and reports hits", () => {
    const r = prefilter(raw(), { now: NOW });
    expect(r.pass).toBe(true);
    expect(r.hits).toEqual(expect.arrayContaining(["website", "next.js", "online store"]));
  });

  it("filters goods supply and construction", () => {
    const r = prefilter(raw({ title: "Supply of furniture for school", description: "Delivery of goods" }), { now: NOW });
    expect(r.pass).toBe(false);
    expect(r.reasons[0]).toMatch(/не наш профиль/);
  });

  it("filters staff vacancies by title", () => {
    const r = prefilter(raw({ title: "Вакансия: React-разработчик в штат", description: "сайт" }), { now: NOW });
    expect(r.pass).toBe(false);
    expect(r.reasons.join()).toMatch(/не проект/);
  });

  it("filters tight or past deadlines", () => {
    expect(prefilter(raw({ deadline: "2026-10-09T20:00:00Z" }), { now: NOW }).reasons.join()).toMatch(/до дедлайна 14 ч/);
    expect(prefilter(raw({ deadline: "2026-10-01T00:00:00Z" }), { now: NOW }).reasons.join()).toMatch(/дедлайн прошёл/);
  });

  it("filters stale posts without a deadline", () => {
    const r = prefilter(raw({ publishedAt: "2026-08-01T00:00:00Z" }), { now: NOW });
    expect(r.reasons.join()).toMatch(/дн\. назад/);
  });

  it("filters budgets below the floor in any currency", () => {
    const r = prefilter(raw({ budgetMax: 5000, currency: "RUB" }), { now: NOW });
    expect(r.reasons.join()).toMatch(/бюджет ниже/);
    expect(prefilter(raw({ budgetMax: 6_000_000, currency: "UZS" }), { now: NOW }).pass).toBe(true);
  });

  it("matches Uzbek with any apostrophe and short words only on boundaries", () => {
    expect(prefilter(raw({ title: "Internet do‘kon kerak", description: "" }), { now: NOW }).pass).toBe(true);
    // «ai» внутри «email» и «mail» не считается.
    const r = prefilter(raw({ title: "Email campaign", description: "Send mail to customers" }), { now: NOW });
    expect(r.hits).not.toContain("ai");
  });
});

describe("quoteFor", () => {
  it("prices with the engine and drops keys outside the catalog", () => {
    const q = quoteFor("website", ["ecommerce", "paymeClickUzum", "seo", "teleport"]);
    const engine = computePricing({
      projectType: "website",
      features: ["ecommerce", "paymeClickUzum"],
      addons: ["seo"],
      urgency: "normal",
    });
    expect(q).toEqual({
      totalMin: engine.totalMin,
      totalMax: engine.totalMax,
      weeks: engine.estimatedWeeks,
      projectType: "website",
      features: ["ecommerce", "paymeClickUzum", "seo"],
    });
  });
});

describe("qualification", () => {
  it("sanitize clamps the score and filters foreign keys", () => {
    const q = sanitizeQualification({
      fit_score: 140,
      verdict: "go",
      summary: "",
      client_need: "",
      deliverables: [],
      project_type: "website",
      feature_keys: ["landing", "rocket"],
      required_stack: [],
      risks: [],
      questions: [],
      reply_language: "en",
      submission_channel: "platform",
      submission_how: "",
      contact: null,
    });
    expect(q.fit_score).toBe(100);
    expect(q.feature_keys).toEqual(["landing"]);
  });

  it("heuristic picks type, language and contact", () => {
    const o = raw({
      source: "telegram",
      title: "Нужен телеграм-бот с ИИ для записи клиентов",
      description: "Бот должен отвечать на вопросы через GPT и писать в amoCRM. Пишите @client_uz",
    });
    const q = heuristicQualification(o, prefilter(o, { now: NOW }));
    expect(q).toMatchObject({ project_type: "ai", reply_language: "ru", submission_channel: "telegram", contact: "@client_uz", by: "heuristic" });
    // crmIntegration нет в каталоге ai — санитайзер его отбрасывает, apiIntegration остаётся.
    expect(q.feature_keys).toEqual(["aiChatbot", "apiIntegration"]);
  });
});

const qual = (over: Partial<Qualification> = {}): Qualification => ({
  fit_score: 80,
  verdict: "go",
  summary: "Магазин на Next.js — наш профиль.",
  client_need: "Онлайн-продажи",
  deliverables: ["Каталог", "Оплата"],
  project_type: "website",
  feature_keys: ["ecommerce"],
  required_stack: ["Next.js"],
  risks: ["Нет контента"],
  questions: ["Сколько товаров?"],
  reply_language: "en",
  submission_channel: "platform",
  submission_how: "Отклик кнопкой на площадке",
  contact: null,
  by: "ai",
  ...over,
});

describe("templateDraft", () => {
  it("writes in the reply language and quotes only engine numbers", () => {
    const quote = quoteFor("website", ["ecommerce"]);
    const d = templateDraft(raw(), qual(), quote, [{ title: "TGPG.UZ", description: "", url: "https://tgpg.uz" }]);
    expect(d).toMatchObject({ kind: "cover_letter", language: "en", by: "template" });
    expect(d.text).toContain("TGPG.UZ — https://tgpg.uz");
    expect(d.text).toContain(`$${quote.totalMin.toLocaleString("en-US")}`);
    const ru = templateDraft(raw(), qual({ reply_language: "ru", submission_channel: "email" }), null, []);
    expect(ru.kind).toBe("eoi");
    expect(ru.text).not.toMatch(/\$/);
  });
});

const row = (over: Partial<OpportunityRow> = {}): OpportunityRow => ({
  id: "0b9e7f2c-3c1d-4b8e-9a51-2f4d6c8e1a00",
  source: "worldbank",
  external_id: "OP1",
  url: "https://example.org/op1",
  title: "Portal <dev> & bot",
  description: "",
  buyer: "PIU INSON",
  country: "Uzbekistan",
  budget_min: null,
  budget_max: null,
  currency: null,
  deadline: "2026-10-22T08:00:00Z",
  published_at: null,
  tags: [],
  fingerprint: "f",
  status: "review",
  score: 82,
  prefilter: null,
  qualification: qual(),
  quote: quoteFor("website", ["ecommerce"]),
  draft: null,
  tg_message_id: null,
  notified_at: null,
  decided_at: null,
  lead_id: null,
  notes: null,
  created_at: "2026-10-09T00:00:00Z",
  updated_at: "2026-10-09T00:00:00Z",
  ...over,
});

describe("card", () => {
  it("parses only well-formed callbacks", () => {
    expect(parseCallback(`pl:go:${row().id}`)).toEqual({ action: "go", id: row().id });
    expect(parseCallback("pl:delete:0b9e7f2c-3c1d-4b8e-9a51-2f4d6c8e1a00")).toBeNull();
    expect(parseCallback("pl:go:1; drop table")).toBeNull();
    expect(parseCallback(undefined)).toBeNull();
  });

  it("callback_data fits Telegram's 64-byte limit", () => {
    for (const btn of keyboardFor(row()).flat()) {
      if (btn.callback_data) expect(Buffer.byteLength(btn.callback_data)).toBeLessThanOrEqual(64);
    }
  });

  it("keyboard follows the status", () => {
    const labels = (s: OpportunityRow["status"]) => keyboardFor(row({ status: s })).flat().map((b) => b.text);
    expect(labels("review")).toEqual(["✅ Подаюсь", "❌ Мимо", "📝 Текст отклика", "🔗 Открыть"]);
    expect(labels("applying")).toContain("📤 Отправлено");
    expect(labels("submitted")).not.toContain("📤 Отправлено");
    expect(labels("dismissed")).toEqual(["🔗 Открыть"]);
    expect(ACTION_STATUS.won).toBe("won");
    // Небезопасный url не попадает в кнопку — иначе Telegram отклонит всю карточку.
    expect(keyboardFor(row({ url: "javascript:alert(1)" })).flat().map((b) => b.text)).not.toContain("🔗 Открыть");
  });

  it("escapes HTML and shows the engine quote and deadline", () => {
    const text = formatCard(row(), new Date("2026-10-09T08:00:00Z"));
    expect(text).toContain("Portal &lt;dev&gt; &amp; bot");
    expect(text).toContain("⭐ 82/100");
    expect(text).toContain("Наша оценка: $");
    expect(text).toContain("через 13 дн.");
  });

  it("draft message wraps the text in <pre> and escapes it", () => {
    const m = formatDraftMessage(row(), { kind: "eoi", subject: null, text: "a < b", checklist: ["CV"], language: "en", by: "ai" });
    expect(m).toContain("<pre>a &lt; b</pre>");
    expect(m).toContain("• CV");
  });
});

describe("routines", () => {
  it("fires each routine once per period from its day", () => {
    const oct9 = new Date("2026-10-09T06:00:00Z"); // пт, 9 октября по Ташкенту
    const due = dueRoutines(oct9, new Set());
    expect(due.map((d) => d.routine.id)).toEqual(expect.arrayContaining(["hn-hired", "reddit-forhire", "upwork-profile", "tender-docs"]));
    expect(due.map((d) => d.routine.id)).not.toContain("reviews"); // 15-го
    const sent = new Set(due.map((d) => d.key));
    expect(dueRoutines(oct9, sent)).toEqual([]);
  });

  it("uses Tashkent time for period boundaries", () => {
    const hn = ROUTINES.find((r) => r.id === "hn-hired")!;
    // 30 сентября 20:00 UTC = 1 октября 01:00 в Ташкенте.
    expect(periodKey(hn, new Date("2026-09-30T20:00:00Z"))).toBe("2026-10");
    const weekly = ROUTINES.find((r) => r.id === "reddit-forhire")!;
    expect(periodKey(weekly, new Date("2026-10-09T06:00:00Z"))).toBe("2026-W41");
  });
});

describe("fingerprint", () => {
  it("ignores case, punctuation and apostrophes", () => {
    expect(fingerprint("Sayt kerak!", "Internet do‘kon")).toBe(fingerprint("sayt KERAK", "internet do'kon"));
    expect(fingerprint("Sayt kerak", "a")).not.toBe(fingerprint("Bot kerak", "a"));
  });
});

describe("fallbackExtract", () => {
  it("one message → one opportunity with the first link and budget", () => {
    const r = fallbackExtract({ subject: "New job: Next.js MVP", text: "Build MVP, budget $3,000\nhttps://www.upwork.com/jobs/~01abc" });
    expect(r).toEqual([
      expect.objectContaining({
        title: "New job: Next.js MVP",
        url: "https://www.upwork.com/jobs/~01abc",
        budgetMax: 3000,
        currency: "USD",
      }),
    ]);
    expect(fallbackExtract({ text: "   " })).toEqual([]);
  });
});

describe("config", () => {
  it("has safe defaults and parses lists", () => {
    const c = readPipelineConfig({
      PIPELINE_TG_CHANNELS: "@UstozShogird, itjobstashkent",
      PIPELINE_SOURCES: "worldbank,telegram,bogus",
      PIPELINE_MIN_SCORE: "70",
    });
    expect(c.sources).toEqual(["worldbank", "telegram"]);
    expect(c.telegramChannels).toEqual(["UstozShogird", "itjobstashkent"]);
    expect(c.minScore).toBe(70);
    expect(readPipelineConfig({})).toMatchObject({ minScore: 60, intervalMinutes: 60, freelancehuntToken: null, routines: true });
    expect(readPipelineConfig({ PIPELINE_ROUTINES: "off" }).routines).toBe(false);
  });
});

describe("gmailForwardScript", () => {
  it("embeds the ingest URL and secret as JS string literals", async () => {
    const { gmailForwardScript } = await import("./gmail-script");
    const s = gmailForwardScript("https://skyline-digital.uz/", 'se"cret');
    expect(s).toContain('const URL = "https://skyline-digital.uz/api/pipeline/ingest";');
    expect(s).toContain('const SECRET = "se\\"cret";');
    expect(s).toContain("everyMinutes(15)");
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Сквозной прогон оркестратора на имитации Supabase и сети: сбор → дедуп →
 * префильтр → оценка (эвристика, ключа модели нет) → цена движком → черновик →
 * карточка в Telegram → кнопки. Живые Supabase/Telegram здесь недоступны,
 * поэтому проверяется логика переходов, а не их API.
 */

type Row = Record<string, unknown>;

/** Минимальная имитация query builder supabase-js — только то, что зовёт конвейер. */
function fakeDb(opts: { missing?: string[] } = {}) {
  const tables: Record<string, Row[]> = { opportunities: [], pipeline_runs: [], pipeline_routine_runs: [], leads: [] };
  let seq = 0;
  const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`;

  function builder(table: string) {
    const filters: ((r: Row) => boolean)[] = [];
    let op: "select" | "insert" | "update" | "upsert" = "select";
    let payload: Row[] = [];
    let patch: Row = {};
    let returning = false;
    let order: { col: string; asc: boolean } | null = null;
    let limit = Infinity;
    let single: "single" | "maybe" | null = null;
    let upsertOpts: { onConflict?: string; ignoreDuplicates?: boolean } = {};

    const run = () => {
      if (opts.missing?.includes(table)) {
        return { data: null, error: { message: `relation "public.${table}" does not exist` } };
      }
      const rows = tables[table];
      let affected: Row[] = [];
      if (op === "insert" || op === "upsert") {
        for (const p of payload) {
          const keys = upsertOpts.onConflict?.split(",") ?? [];
          const clash = keys.length && rows.find((r) => keys.every((k) => r[k] === p[k]));
          if (clash) continue;
          const row: Row = { id: uuid(), created_at: new Date().toISOString(), lead_number: table === "leads" ? `LEAD-2026-${String(seq).padStart(5, "0")}` : undefined, ...p };
          rows.push(row);
          affected.push(row);
        }
      } else {
        affected = rows.filter((r) => filters.every((f) => f(r)));
        if (op === "update") for (const r of affected) Object.assign(r, patch);
      }
      if (order) {
        const { col, asc } = order;
        affected = [...affected].sort((a, b) => ((a[col] as number) > (b[col] as number) ? 1 : -1) * (asc ? 1 : -1));
      }
      affected = affected.slice(0, limit);
      const data = op === "select" || returning ? affected.map((r) => ({ ...r })) : null;
      if (single) return { data: data?.[0] ?? null, error: single === "single" && !data?.[0] ? { message: "no rows" } : null };
      return { data, error: null };
    };

    const b = {
      select: () => ((returning = op !== "select"), b),
      insert: (rows: Row | Row[]) => ((op = "insert"), (payload = Array.isArray(rows) ? rows : [rows]), b),
      upsert: (rows: Row[], opts: typeof upsertOpts) => ((op = "upsert"), (payload = rows), (upsertOpts = opts), b),
      update: (p: Row) => ((op = "update"), (patch = p), b),
      eq: (c: string, v: unknown) => (filters.push((r) => r[c] === v), b),
      is: (c: string, v: unknown) => (filters.push((r) => (r[c] ?? null) === v), b),
      in: (c: string, vs: unknown[]) => (filters.push((r) => vs.includes(r[c])), b),
      lt: (c: string, v: string) => (filters.push((r) => r[c] != null && String(r[c]) < v), b),
      gte: (c: string, v: string) => (filters.push((r) => r[c] != null && String(r[c]) >= v), b),
      order: (col: string, o?: { ascending?: boolean }) => ((order = { col, asc: o?.ascending ?? true }), b),
      limit: (n: number) => ((limit = n), b),
      single: () => ((single = "single"), b),
      maybeSingle: () => ((single = "maybe"), b),
      then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve().then(run).then(res, rej),
    };
    return b;
  }
  return { tables, db: { from: (t: string) => builder(t) } as unknown as SupabaseClient };
}

const TG_HTML = `
<div class="tgme_widget_message js-widget_message" data-post="zakazy_uz/10"><div class="tgme_widget_message_text js-message_text">Нужен интернет-магазин на Next.js с оплатой Payme и Click, админка, 3 языка. Бюджет $2,500. Пишите @shop_owner</div><time datetime="2026-10-08T09:00:00+00:00"></time></div>
<div class="tgme_widget_message js-widget_message" data-post="zakazy_uz/11"><div class="tgme_widget_message_text js-message_text">Поставка мебели для офиса, 40 столов и стульев, доставка до склада</div><time datetime="2026-10-08T09:30:00+00:00"></time></div>
<div class="tgme_widget_message js-widget_message" data-post="zakazy_uz/12"><div class="tgme_widget_message_text js-message_text">Repost: Нужен интернет-магазин на Next.js с оплатой Payme и Click, админка, 3 языка. Бюджет $2,500. Пишите @shop_owner</div><time datetime="2026-10-08T09:40:00+00:00"></time></div>`;

describe("runPipeline (end to end on fakes)", () => {
  const telegramCalls: { method: string; body: Row }[] = [];

  beforeEach(() => {
    vi.resetModules();
    telegramCalls.length = 0;
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "test-token");
    vi.stubEnv("TELEGRAM_CHAT_ID", "-100");
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("PIPELINE_SOURCES", "telegram");
    vi.stubEnv("PIPELINE_TG_CHANNELS", "zakazy_uz");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url.startsWith("https://t.me/s/")) return new Response(TG_HTML, { status: 200 });
        if (url.startsWith("https://api.telegram.org/")) {
          const method = url.split("/").pop()!;
          telegramCalls.push({ method, body: JSON.parse(String(init?.body ?? "{}")) });
          return Response.json({ ok: true, result: { message_id: 100 + telegramCalls.length } });
        }
        return new Response("not found", { status: 404 });
      }),
    );
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("collects, dedupes, filters, prices, drafts and sends one card", async () => {
    const { runPipeline } = await import("./run");
    const { db, tables } = fakeDb();
    const now = new Date("2026-10-09T06:00:00Z");

    const stats = await runPipeline(db, { force: true, now, fetchImpl: fetch });

    expect(stats.collected.telegram).toBe(3);
    // Репост с тем же текстом — другой отпечаток (есть «Repost:»), поэтому 3 вставки; мебель — отсев.
    expect(stats.inserted).toBe(3);
    expect(stats.filtered).toBe(1);
    expect(stats.review).toBe(2);
    expect(stats.errors).toEqual({});

    const shop = tables.opportunities.find((r) => r.external_id === "zakazy_uz/10")!;
    expect(shop.status).toBe("review");
    expect(shop.quote).toMatchObject({ projectType: "website" });
    expect((shop.quote as { features: string[] }).features).toEqual(expect.arrayContaining(["ecommerce", "paymeClickUzum"]));
    expect(shop.draft).toMatchObject({ language: "ru", kind: "chat_reply", by: "template" });
    expect(tables.opportunities.find((r) => r.external_id === "zakazy_uz/11")!.status).toBe("filtered");

    // Карточки ушли с кнопками, сохранён id сообщения.
    const cards = telegramCalls.filter((c) => c.method === "sendMessage" && c.body.reply_markup);
    expect(cards).toHaveLength(2);
    expect(String(cards[0].body.text)).toContain("Наша оценка: $");
    expect(shop.tg_message_id).toBeTypeOf("number");

    // Повторный прогон: ничего нового, карточки не дублируются.
    const again = await runPipeline(db, { force: true, now, fetchImpl: fetch });
    expect(again.inserted).toBe(0);
    expect(again.notified).toBe(0);

    // Троттлинг без force.
    const throttled = await runPipeline(db, { now, fetchImpl: fetch });
    expect(throttled.skipped).toBe("throttled");
  });

  it("button flow: go → draft sent; won → lead created", async () => {
    const { runPipeline } = await import("./run");
    const { applyAction } = await import("./actions");
    const { db, tables } = fakeDb();
    await runPipeline(db, { force: true, now: new Date("2026-10-09T06:00:00Z"), fetchImpl: fetch });
    const shop = tables.opportunities.find((r) => r.external_id === "zakazy_uz/10")!;
    telegramCalls.length = 0;

    const go = await applyAction(db, shop.id as string, "go");
    expect(go.ok).toBe(true);
    expect(shop.status).toBe("applying");
    expect(telegramCalls.map((c) => c.method)).toEqual(["editMessageReplyMarkup", "sendMessage"]);
    expect(String(telegramCalls[1].body.text)).toContain("<pre>");

    const won = await applyAction(db, shop.id as string, "won");
    expect(won.ok).toBe(true);
    expect(shop.status).toBe("won");
    expect(tables.leads).toHaveLength(1);
    expect(tables.leads[0]).toMatchObject({ source: "pipeline:telegram", telegram: "@shop_owner", currency: "USD" });
    expect(shop.lead_id).toBe(tables.leads[0].id);
  });

  it("a broken source is reported, not fatal", async () => {
    vi.stubEnv("PIPELINE_SOURCES", "telegram,worldbank");
    const { runPipeline } = await import("./run");
    const { db } = fakeDb();
    const stats = await runPipeline(db, { force: true, now: new Date("2026-10-09T06:00:00Z"), fetchImpl: fetch });
    expect(stats.errors.worldbank).toMatch(/HTTP 404/);
    expect(stats.collected.telegram).toBe(3);
  });

  it("without migration it skips before touching sources", async () => {
    const { runPipeline } = await import("./run");
    const { db } = fakeDb({ missing: ["pipeline_runs", "opportunities"] });
    const stats = await runPipeline(db, { now: new Date("2026-10-09T06:00:00Z"), fetchImpl: fetch });
    expect(stats.skipped).toMatch(/0013/);
    expect(vi.mocked(fetch).mock.calls.some(([u]) => String(u).startsWith("https://t.me/"))).toBe(false);
  });

  it("a card Telegram rejects (400) does not block the queue", async () => {
    let first = true;
    vi.mocked(fetch).mockImplementation(async (url: string | URL | Request, init?: RequestInit) => {
      const u = String(url);
      if (u.startsWith("https://t.me/s/")) return new Response(TG_HTML, { status: 200 });
      const body = JSON.parse(String(init?.body ?? "{}"));
      telegramCalls.push({ method: u.split("/").pop()!, body });
      if (body.reply_markup && first) {
        first = false;
        return Response.json({ ok: false, error_code: 400, description: "Bad Request: wrong url" });
      }
      return Response.json({ ok: true, result: { message_id: 7 } });
    });
    const { runPipeline } = await import("./run");
    const { db, tables } = fakeDb();
    const stats = await runPipeline(db, { force: true, now: new Date("2026-10-09T06:00:00Z"), fetchImpl: fetch });
    expect(stats.notified).toBe(1);
    expect(stats.errors.telegram).toMatch(/^400/);
    const reviewed = tables.opportunities.filter((r) => r.status === "review");
    expect(reviewed.every((r) => r.notified_at)).toBe(true);
    expect(reviewed.some((r) => String(r.notes).includes("wrong url"))).toBe(true);
  });
});

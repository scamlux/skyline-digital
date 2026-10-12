import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getProjects } from "@/lib/portfolio";
import { esc, isTelegramConfigured, sendTelegramMessage, sendTelegramWithKeyboard } from "@/lib/telegram";
import { draftReply, qualifyOpportunity } from "./ai";
import { formatCard, keyboardFor } from "./card";
import { collectFreelancehunt } from "./collectors/freelancehunt";
import { collectReddit } from "./collectors/reddit";
import { collectRss } from "./collectors/rss";
import { collectTelegram } from "./collectors/telegram";
import { collectWorldbank } from "./collectors/worldbank";
import { readPipelineConfig, type PipelineConfig } from "./config";
import type { PortfolioCase } from "./draft";
import { fingerprint } from "./fingerprint";
import { prefilter } from "./prefilter";
import { quoteFor } from "./quote";
import { dueRoutines, periodKey } from "./routines";
import type { OpportunityRow, OpportunitySource, RawOpportunity } from "./types";

/**
 * Оркестратор конвейера: сбор → дедуп → префильтр → ИИ-оценка → цена движком →
 * черновик → карточка в Telegram. Плюс истечение дедлайнов, рутины профилей и
 * недельная сводка. Ошибка одного источника не валит прогон — она попадает в
 * pipeline_runs.errors и в сводку, а не в тишину.
 */

export interface RunStats {
  skipped?: string;
  collected: Partial<Record<OpportunitySource, number>>;
  inserted: number;
  duplicates: number;
  filtered: number;
  rejected: number;
  review: number;
  notified: number;
  expired: number;
  routines: number;
  errors: Record<string, string>;
}

const emptyStats = (): RunStats => ({
  collected: {},
  inserted: 0,
  duplicates: 0,
  filtered: 0,
  rejected: 0,
  review: 0,
  notified: 0,
  expired: 0,
  routines: 0,
  errors: {},
});

export function rowToRaw(r: OpportunityRow): RawOpportunity {
  return {
    source: r.source,
    externalId: r.external_id,
    url: r.url,
    title: r.title,
    description: r.description,
    buyer: r.buyer,
    country: r.country,
    budgetMin: r.budget_min,
    budgetMax: r.budget_max,
    currency: r.currency,
    deadline: r.deadline,
    publishedAt: r.published_at,
    tags: r.tags ?? [],
  };
}

async function collectAll(
  cfg: PipelineConfig,
  stats: RunStats,
  fetchImpl?: typeof fetch,
): Promise<RawOpportunity[]> {
  const jobs: [OpportunitySource, () => Promise<RawOpportunity[]>][] = [];
  for (const s of cfg.sources) {
    if (s === "worldbank") jobs.push([s, () => collectWorldbank(cfg.worldbankCountries, fetchImpl)]);
    if (s === "reddit") jobs.push([s, () => collectReddit(cfg.subreddits, fetchImpl)]);
    if (s === "telegram" && cfg.telegramChannels.length)
      jobs.push([s, () => collectTelegram(cfg.telegramChannels, fetchImpl)]);
    if (s === "rss" && cfg.rssFeeds.length) jobs.push([s, () => collectRss(cfg.rssFeeds, fetchImpl)]);
    if (s === "freelancehunt" && cfg.freelancehuntToken)
      jobs.push([s, () => collectFreelancehunt(cfg.freelancehuntToken!, fetchImpl)]);
  }
  const settled = await Promise.allSettled(jobs.map(([, fn]) => fn()));
  const out: RawOpportunity[] = [];
  settled.forEach((r, i) => {
    const src = jobs[i][0];
    if (r.status === "fulfilled") {
      stats.collected[src] = r.value.length;
      out.push(...r.value);
    } else {
      stats.errors[src] = String(r.reason instanceof Error ? r.reason.message : r.reason).slice(0, 300);
    }
  });
  return out;
}

/** Вставка новых возможностей с дедупом по (source, external_id) и отпечатку. */
export async function storeOpportunities(
  db: SupabaseClient,
  items: RawOpportunity[],
): Promise<{ inserted: OpportunityRow[]; duplicates: number }> {
  if (!items.length) return { inserted: [], duplicates: 0 };
  const withFp = items.map((o) => ({ o, fp: fingerprint(o.title, o.description) }));
  // Внутри пачки — первый по отпечатку.
  const seen = new Set<string>();
  const unique = withFp.filter(({ fp }) => (seen.has(fp) ? false : (seen.add(fp), true)));

  const known = new Set<string>();
  for (let i = 0; i < unique.length; i += 200) {
    const { data } = await db
      .from("opportunities")
      .select("fingerprint")
      .in("fingerprint", unique.slice(i, i + 200).map((u) => u.fp));
    for (const r of data ?? []) known.add(r.fingerprint as string);
  }
  const fresh = unique.filter(({ fp }) => !known.has(fp));
  if (!fresh.length) return { inserted: [], duplicates: items.length };

  const { data, error } = await db
    .from("opportunities")
    .upsert(
      fresh.map(({ o, fp }) => ({
        source: o.source,
        external_id: o.externalId.slice(0, 300),
        url: o.url,
        title: o.title.slice(0, 500),
        description: o.description.slice(0, 20_000),
        buyer: o.buyer ?? null,
        country: o.country ?? null,
        budget_min: o.budgetMin ?? null,
        budget_max: o.budgetMax ?? null,
        currency: o.currency ?? null,
        deadline: o.deadline ?? null,
        published_at: o.publishedAt ?? null,
        tags: o.tags ?? [],
        fingerprint: fp,
        status: "new",
      })),
      { onConflict: "source,external_id", ignoreDuplicates: true },
    )
    .select("*");
  if (error) throw error;
  const inserted = (data ?? []) as OpportunityRow[];
  return { inserted, duplicates: items.length - inserted.length };
}

let portfolioCache: PortfolioCase[] | null = null;
async function portfolio(): Promise<PortfolioCase[]> {
  if (portfolioCache) return portfolioCache;
  try {
    const list = await getProjects();
    portfolioCache = list.map((p) => ({ title: p.title, description: p.description, url: p.url ?? null }));
  } catch {
    portfolioCache = [];
  }
  return portfolioCache;
}

/**
 * Обработка новых строк: префильтр (бесплатно, все), затем ИИ-оценка и
 * черновик (платно, не больше maxAi). Не успевшие остаются `new` до
 * следующего прогона.
 */
export async function processNew(
  db: SupabaseClient,
  cfg: PipelineConfig,
  stats: RunStats,
  opts: { ids?: string[]; now?: Date; forceReview?: boolean } = {},
): Promise<void> {
  let q = db.from("opportunities").select("*").eq("status", "new").order("created_at", { ascending: true }).limit(500);
  if (opts.ids) q = q.in("id", opts.ids);
  const { data } = await q;
  const rows = (data ?? []) as OpportunityRow[];
  let aiBudget = cfg.maxAiPerRun;
  for (const row of rows) {
    const raw = rowToRaw(row);
    // Переслано владельцем вручную → он уже решил, что смотреть: без отсева.
    const pf = opts.forceReview ? { pass: true, hits: [], reasons: [] } : prefilter(raw, { now: opts.now });
    if (!pf.pass) {
      await db.from("opportunities").update({ status: "filtered", prefilter: pf }).eq("id", row.id);
      stats.filtered++;
      continue;
    }
    if (aiBudget <= 0) {
      await db.from("opportunities").update({ prefilter: pf }).eq("id", row.id);
      continue;
    }
    aiBudget--;
    const q8n = await qualifyOpportunity(raw, pf);
    if (!opts.forceReview && (q8n.verdict === "no" || q8n.fit_score < cfg.minScore)) {
      await db
        .from("opportunities")
        .update({ status: "rejected", prefilter: pf, qualification: q8n, score: q8n.fit_score })
        .eq("id", row.id);
      stats.rejected++;
      continue;
    }
    const quote = q8n.project_type === "other" ? null : quoteFor(q8n.project_type, q8n.feature_keys);
    const draft = await draftReply(raw, q8n, quote, await portfolio());
    await db
      .from("opportunities")
      .update({ status: "review", prefilter: pf, qualification: q8n, score: q8n.fit_score, quote, draft })
      .eq("id", row.id);
    stats.review++;
  }
}

/** Карточки в Telegram: лучшие по оценке, не больше лимита за прогон. */
export async function notifyReview(db: SupabaseClient, cfg: PipelineConfig, stats: RunStats): Promise<void> {
  if (!isTelegramConfigured()) return;
  const { data } = await db
    .from("opportunities")
    .select("*")
    .eq("status", "review")
    .is("notified_at", null)
    .order("score", { ascending: false })
    .limit(cfg.maxNotifyPerRun);
  for (const row of (data ?? []) as OpportunityRow[]) {
    const res = await sendTelegramWithKeyboard(formatCard(row), keyboardFor(row));
    if (!res.ok) {
      stats.errors.telegram = res.error ?? "send failed";
      // 400 — карточка сама битая: помечаем и идём дальше, иначе она навсегда
      // заблокирует очередь. Иное (сеть, 429, 5xx) — стоп, повторим в следующий прогон.
      if (res.error?.startsWith("400")) {
        await db
          .from("opportunities")
          .update({ notified_at: new Date().toISOString(), notes: `telegram: ${res.error}`.slice(0, 500) })
          .eq("id", row.id);
        continue;
      }
      break;
    }
    await db
      .from("opportunities")
      .update({ notified_at: new Date().toISOString(), tg_message_id: res.messageId ?? null })
      .eq("id", row.id);
    stats.notified++;
  }
}

async function expireOld(db: SupabaseClient, stats: RunStats, now: Date): Promise<void> {
  const { data } = await db
    .from("opportunities")
    .update({ status: "expired" })
    .in("status", ["new", "review"])
    .lt("deadline", now.toISOString())
    .select("id");
  stats.expired = data?.length ?? 0;
}

async function sendRoutines(db: SupabaseClient, stats: RunStats, now: Date): Promise<void> {
  if (!isTelegramConfigured()) return;
  const { data } = await db.from("pipeline_routine_runs").select("key").order("sent_at", { ascending: false }).limit(500);
  const sent = new Set((data ?? []).map((r) => r.key as string));

  for (const { routine, key } of dueRoutines(now, sent)) {
    const msg =
      `🗓 <b>${esc(routine.title)}</b>\n${esc(routine.url)}\n\n<pre>${esc(routine.text)}</pre>`;
    const res = await sendTelegramMessage(msg);
    if (!res.ok) break;
    await db.from("pipeline_routine_runs").insert({ key });
    stats.routines++;
  }

  // Недельная сводка по пятницам.
  const digestKey = `digest:${periodKey({ id: "digest", cadence: "weekly", day: 5, title: "", url: "", text: "" }, now)}`;
  const dow = new Date(now.getTime() + 5 * 3_600_000).getUTCDay();
  if ((dow === 5 || dow === 6 || dow === 0) && !sent.has(digestKey)) {
    const since = new Date(now.getTime() - 7 * 86_400_000).toISOString();
    const { data: week } = await db.from("opportunities").select("status").gte("created_at", since);
    const by: Record<string, number> = {};
    for (const r of week ?? []) by[r.status as string] = (by[r.status as string] ?? 0) + 1;
    const total = week?.length ?? 0;
    const res = await sendTelegramMessage(
      `📊 <b>Конвейер за неделю</b>\nНайдено: ${total}\nОтсеяно фильтром: ${by.filtered ?? 0} · не прошло оценку: ${by.rejected ?? 0}\n` +
        `На решении: ${by.review ?? 0} · подаюсь: ${by.applying ?? 0} · отправлено: ${by.submitted ?? 0}\n` +
        `Выиграли: ${by.won ?? 0} · не взяли: ${by.lost ?? 0}\nВсе карточки: /admin/pipeline`,
    );
    if (res.ok) await db.from("pipeline_routine_runs").insert({ key: digestKey });
  }
}

export async function runPipeline(
  db: SupabaseClient,
  opts: { trigger?: "cron" | "manual"; force?: boolean; fetchImpl?: typeof fetch; now?: Date } = {},
): Promise<RunStats> {
  const cfg = readPipelineConfig();
  const now = opts.now ?? new Date();
  const stats = emptyStats();

  if (!opts.force) {
    const { data: last } = await db
      .from("pipeline_runs")
      .select("started_at")
      .eq("trigger", "cron")
      .order("started_at", { ascending: false })
      .limit(1);
    const lastAt = last?.[0]?.started_at ? new Date(last[0].started_at as string).getTime() : 0;
    if (now.getTime() - lastAt < cfg.intervalMinutes * 60_000) {
      return { ...stats, skipped: "throttled" };
    }
  }

  const { data: run, error: runErr } = await db
    .from("pipeline_runs")
    .insert({ trigger: opts.trigger ?? "cron", started_at: now.toISOString() })
    .select("id")
    .single();
  // Нет таблиц (миграция 0013 не применена) — не ходим в источники вхолостую каждые 15 минут.
  if (runErr || !run) return { ...stats, skipped: "pipeline tables missing — apply 0013_pipeline.sql" };

  try {
    const items = await collectAll(cfg, stats, opts.fetchImpl);
    const { inserted, duplicates } = await storeOpportunities(db, items);
    stats.inserted = inserted.length;
    stats.duplicates = duplicates;
    await processNew(db, cfg, stats, { now });
    await notifyReview(db, cfg, stats);
    await expireOld(db, stats, now);
    if (cfg.routines) await sendRoutines(db, stats, now);
  } catch (err) {
    stats.errors.pipeline = String(err instanceof Error ? err.message : err).slice(0, 300);
  }

  {
    await db
      .from("pipeline_runs")
      .update({ finished_at: new Date().toISOString(), stats, errors: Object.keys(stats.errors).length ? stats.errors : null })
      .eq("id", run.id);
  }
  return stats;
}

/**
 * Ingest (письмо-оповещение, пересланное боту сообщение): сразу через
 * весь путь и карточкой владельцу, без ожидания крона.
 */
export async function ingestNow(
  db: SupabaseClient,
  items: RawOpportunity[],
  opts: { forceReview?: boolean } = {},
): Promise<RunStats> {
  const cfg = readPipelineConfig();
  const stats = emptyStats();
  stats.collected.ingest = items.length;
  const { inserted, duplicates } = await storeOpportunities(db, items);
  stats.inserted = inserted.length;
  stats.duplicates = duplicates;
  if (inserted.length) {
    await processNew(db, cfg, stats, { ids: inserted.map((r) => r.id), forceReview: opts.forceReview });
    await notifyReview(db, { ...cfg, maxNotifyPerRun: Math.max(cfg.maxNotifyPerRun, inserted.length) }, stats);
  }
  return stats;
}

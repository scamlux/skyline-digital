import Link from "next/link";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { readPipelineConfig } from "@/lib/pipeline/config";
import { formatQuote } from "@/lib/pipeline/quote";
import { STATUS_RU, typeLabelRu } from "@/lib/pipeline/labels";
import { OPPORTUNITY_STATUSES, type OpportunityRow } from "@/lib/pipeline/types";
import { OpportunityActions, RunButton } from "./PipelineClient";

export const dynamic = "force-dynamic";

const TABS: { key: string; label: string; statuses: string[] }[] = [
  { key: "review", label: "На решении", statuses: ["review"] },
  { key: "work", label: "В работе", statuses: ["applying", "submitted"] },
  { key: "won", label: "Выиграли", statuses: ["won"] },
  { key: "out", label: "Отсеяно", statuses: ["filtered", "rejected", "dismissed", "lost", "expired"] },
  { key: "all", label: "Все", statuses: [...OPPORTUNITY_STATUSES] },
];

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  if (!isSupabaseConfigured()) {
    return <div className="p-8 text-gray-500">Supabase не настроен.</div>;
  }
  const db = getSupabaseAdmin();
  const cfg = readPipelineConfig();
  const tab = TABS.find((t) => t.key === sp.tab) ?? TABS[0];

  let q = db.from("opportunities").select("*").in("status", tab.statuses);
  if (sp.source) q = q.eq("source", sp.source);
  const [{ data }, { data: runs }, { data: counts }] = await Promise.all([
    q.order("score", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }).limit(100),
    db.from("pipeline_runs").select("*").order("started_at", { ascending: false }).limit(1),
    db.from("opportunities").select("status"),
  ]);
  const rows = (data ?? []) as OpportunityRow[];
  const lastRun = runs?.[0] as { started_at: string; stats: Record<string, unknown> | null; errors: Record<string, string> | null } | undefined;
  const byStatus: Record<string, number> = {};
  for (const r of counts ?? []) byStatus[r.status as string] = (byStatus[r.status as string] ?? 0) + 1;

  const sourcesState = [
    { name: "Всемирный банк", on: cfg.sources.includes("worldbank"), note: cfg.worldbankCountries.join(", ") },
    { name: "Reddit", on: cfg.sources.includes("reddit"), note: cfg.subreddits.map((s) => `r/${s}`).join(", ") },
    { name: "Telegram-каналы", on: cfg.sources.includes("telegram") && cfg.telegramChannels.length > 0, note: cfg.telegramChannels.map((c) => `@${c}`).join(", ") || "PIPELINE_TG_CHANNELS не задан" },
    { name: "RSS", on: cfg.sources.includes("rss") && cfg.rssFeeds.length > 0, note: `${cfg.rssFeeds.length} лент` },
    { name: "Freelancehunt", on: cfg.sources.includes("freelancehunt") && Boolean(cfg.freelancehuntToken), note: cfg.freelancehuntToken ? "токен есть" : "FREELANCEHUNT_TOKEN не задан" },
    { name: "Письма-оповещения", on: Boolean(process.env.PIPELINE_INGEST_SECRET), note: "/api/pipeline/ingest" },
    { name: "Пересылка боту", on: Boolean(process.env.TELEGRAM_WEBHOOK_SECRET), note: "/api/telegram/webhook" },
  ];

  return (
    <div className="p-8">
      <h1 className="mb-1 text-2xl font-bold text-gray-900">Конвейер заказов</h1>
      <p className="mb-6 text-sm text-gray-500">
        Система находит, оценивает и готовит отклик. Решение и отправка — за тобой: кнопки здесь или в Telegram.
      </p>

      <div className="mb-6 grid gap-4 lg:grid-cols-[2fr_3fr]">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-3 text-sm font-semibold text-gray-700">Источники</div>
          <ul className="space-y-1.5 text-sm">
            {sourcesState.map((s) => (
              <li key={s.name} className="flex gap-2">
                <span>{s.on ? "🟢" : "⚪️"}</span>
                <span className="font-medium text-gray-800">{s.name}</span>
                <span className="truncate text-gray-500">{s.note}</span>
                {lastRun?.errors?.[sourceKey(s.name)] && <span className="text-red-600">ошибка</span>}
              </li>
            ))}
          </ul>
          <div className="mt-3 text-xs text-gray-500">
            Порог оценки {cfg.minScore}/100 · ИИ-оценок за прогон ≤ {cfg.maxAiPerRun} · карточек ≤ {cfg.maxNotifyPerRun} · прогон не чаще раза в {cfg.intervalMinutes} мин
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-3 text-sm font-semibold text-gray-700">Последний прогон</div>
          {lastRun ? (
            <div className="space-y-1 text-sm text-gray-700">
              <div>{new Date(lastRun.started_at).toLocaleString("ru-RU", { timeZone: "Asia/Tashkent" })}</div>
              <div className="text-gray-500">{summarize(lastRun.stats)}</div>
              {lastRun.errors && (
                <div className="text-xs text-red-600">
                  {Object.entries(lastRun.errors).map(([k, v]) => (
                    <div key={k}>
                      {k}: {v}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-500">Прогонов ещё не было.</div>
          )}
          <div className="mt-4">
            <RunButton />
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const n = t.statuses.reduce((a, s) => a + (byStatus[s] ?? 0), 0);
          return (
            <Link
              key={t.key}
              href={`/admin/pipeline?tab=${t.key}`}
              className={`rounded-lg px-3 py-1.5 text-sm ${t.key === tab.key ? "bg-gray-900 text-white" : "border border-gray-300 bg-white text-gray-700"}`}
            >
              {t.label} <span className="opacity-60">{n}</span>
            </Link>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">Пусто.</div>
      ) : (
        <div className="space-y-3">
          {rows.map((o) => (
            <details key={o.id} className="rounded-xl border border-gray-200 bg-white">
              <summary className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
                <span className="w-12 font-mono text-sm font-semibold text-gray-900">{o.score ?? "—"}</span>
                <span className="min-w-0 flex-1 font-medium text-gray-900">{o.title}</span>
                <span className="text-xs text-gray-500">{o.source}</span>
                {o.quote && <span className="text-xs text-gray-700">{formatQuote(o.quote)}</span>}
                {o.deadline && (
                  <span className="text-xs text-gray-500">
                    до {new Date(o.deadline).toLocaleDateString("ru-RU", { timeZone: "Asia/Tashkent" })}
                  </span>
                )}
                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{STATUS_RU[o.status]}</span>
              </summary>
              <div className="grid gap-6 border-t border-gray-100 p-4 lg:grid-cols-2">
                <div className="space-y-2 text-sm text-gray-700">
                  {o.qualification?.summary && <p>{o.qualification.summary}</p>}
                  {o.quote && (
                    <p>
                      <b>Оценка движка:</b> {formatQuote(o.quote)} · {typeLabelRu(o.quote.projectType)}
                    </p>
                  )}
                  {o.qualification?.submission_how && (
                    <p>
                      <b>Как подаваться:</b> {o.qualification.submission_how}
                    </p>
                  )}
                  {o.qualification?.risks?.length ? (
                    <p>
                      <b>Риски:</b> {o.qualification.risks.join(" · ")}
                    </p>
                  ) : null}
                  {o.prefilter?.reasons?.length ? (
                    <p className="text-gray-500">
                      <b>Почему отсеяно:</b> {o.prefilter.reasons.join(" · ")}
                    </p>
                  ) : null}
                  {o.url && (
                    <a href={o.url} target="_blank" rel="noreferrer" className="inline-block text-blue-700 underline">
                      Открыть источник
                    </a>
                  )}
                  <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                    {o.description}
                  </pre>
                </div>
                <OpportunityActions id={o.id} status={o.status} draftText={o.draft?.text ?? null} />
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

function sourceKey(name: string): string {
  return (
    { "Всемирный банк": "worldbank", Reddit: "reddit", "Telegram-каналы": "telegram", RSS: "rss", Freelancehunt: "freelancehunt" } as Record<string, string>
  )[name] ?? "";
}

function summarize(stats: Record<string, unknown> | null): string {
  if (!stats) return "в процессе или прерван";
  const s = stats as { inserted?: number; filtered?: number; rejected?: number; review?: number; notified?: number };
  return `новых ${s.inserted ?? 0} · отсеяно ${s.filtered ?? 0} · не прошло ${s.rejected ?? 0} · на решение ${s.review ?? 0} · карточек ${s.notified ?? 0}`;
}

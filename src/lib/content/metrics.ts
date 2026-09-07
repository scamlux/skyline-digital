import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Сбор метрик Instagram (ПРОМПТ-3 §1.7). GET /<IG_MEDIA_ID>/insights через сутки
 * (окно 24h) и через неделю (7d) после публикации → content_metrics. Идемпотентно
 * по уникальному индексу (publication_id, window). Имена полей insights зависят
 * от версии Graph API — берём набор и раскладываем защитно (что пришло, то и пишем).
 */

const TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const VERSION = process.env.INSTAGRAM_GRAPH_VERSION || "v21.0";
const GRAPH = "https://graph.facebook.com";
const DAY = 86_400_000;
const IG_METRICS = "reach,saved,likes,comments,shares";

interface Insight {
  name: string;
  values?: { value: number }[];
}

async function fetchInsights(mediaId: string): Promise<Record<string, number>> {
  const q = new URLSearchParams({ metric: IG_METRICS, access_token: TOKEN! });
  const res = await fetch(`${GRAPH}/${VERSION}/${mediaId}/insights?${q}`);
  const json = (await res.json().catch(() => ({}))) as { data?: Insight[]; error?: { message?: string } };
  if (json.error) throw new Error(json.error.message ?? "insights error");
  const out: Record<string, number> = {};
  for (const it of json.data ?? []) out[it.name] = it.values?.[0]?.value ?? 0;
  return out;
}

function mapMetrics(ins: Record<string, number>) {
  return {
    views: ins.reach ?? null,
    saves: ins.saved ?? null,
    likes: ins.likes ?? null,
    comments: ins.comments ?? null,
    shares: ins.shares ?? null,
  };
}

export async function collectDueMetrics(
  db: SupabaseClient,
): Promise<{ collected: number; errors: number }> {
  if (!TOKEN) return { collected: 0, errors: 0 };
  const now = Date.now();

  const { data: pubs } = await db
    .from("content_publications")
    .select("id,external_id,published_at")
    .eq("platform", "instagram")
    .eq("status", "published")
    .not("external_id", "is", null)
    .not("published_at", "is", null);

  let collected = 0;
  let errors = 0;
  for (const p of (pubs ?? []) as { id: string; external_id: string; published_at: string }[]) {
    const age = now - Date.parse(p.published_at);
    const windows: string[] = [];
    if (age >= DAY) windows.push("24h");
    if (age >= 7 * DAY) windows.push("7d");
    if (!windows.length) continue;

    const { data: have } = await db
      .from("content_metrics")
      .select("window")
      .eq("publication_id", p.id);
    const done = new Set((have ?? []).map((r) => (r as { window: string }).window));
    const todo = windows.filter((w) => !done.has(w));
    if (!todo.length) continue;

    let ins: Record<string, number>;
    try {
      ins = await fetchInsights(p.external_id);
    } catch {
      errors++;
      continue;
    }
    const m = mapMetrics(ins);
    for (const w of todo) {
      await db.from("content_metrics").upsert(
        { publication_id: p.id, window: w, collected_at: new Date().toISOString(), ...m },
        { onConflict: "publication_id,window" },
      );
      collected++;
    }
  }
  return { collected, errors };
}

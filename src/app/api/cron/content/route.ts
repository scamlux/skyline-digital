import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { publishDuePost } from "@/lib/content/publish";
import type { ContentPostRow } from "@/lib/content/store";

// Крон расписания (ПРОМПТ-3 §1.1/§1.4/§1.5): посты в статусе scheduled с
// наступившей датой публикуются по настроенным API (Telegram-канал, Instagram),
// а площадки без API дают напоминание в чат лидов. Сравнение scheduled_at (UTC)
// <= now() снимает вопрос часового пояса. Защита: CRON_SECRET в заголовке
// Authorization (Vercel Cron подставляет его сам), без секрета — 401.
export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "supabase not configured" }, { status: 503 });
  }
  const db = getSupabaseAdmin();
  const { data } = await db
    .from("content_posts")
    .select("*")
    .eq("status", "scheduled")
    .lte("scheduled_at", new Date().toISOString())
    .limit(5);
  const results: Record<string, unknown>[] = [];
  for (const post of (data ?? []) as ContentPostRow[]) {
    const publications = await publishDuePost(db, post);
    results.push({ slug: post.slug, publications });
  }
  return NextResponse.json({ processed: results.length, results });
}

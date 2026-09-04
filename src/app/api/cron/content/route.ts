import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { publishToTelegram } from "@/lib/content/publish-telegram";
import type { ContentPostRow } from "@/lib/content/store";

// Крон расписания (ТЗ §7.4): посты в статусе scheduled с наступившей датой
// публикуются в Telegram. Защита: CRON_SECRET в заголовке Authorization
// (Vercel Cron подставляет его сам), без секрета — только 401.
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
    if (!post.platforms.includes("telegram")) continue;
    const r = await publishToTelegram(db, post);
    results.push({ slug: post.slug, ...r });
  }
  return NextResponse.json({ processed: results.length, results });
}

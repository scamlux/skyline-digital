import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { runPipeline } from "@/lib/pipeline/run";

// Крон конвейера заказов (ADR 0004). Тот же CRON_SECRET, что у контента.
// Без ?force=1 прогон троттлится: не чаще PIPELINE_INTERVAL_MIN (дефолт 60 мин),
// поэтому его безопасно дёргать из 15-минутного тикера.
export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "supabase not configured" }, { status: 503 });
  }
  const force = new URL(req.url).searchParams.get("force") === "1";
  const stats = await runPipeline(getSupabaseAdmin(), { trigger: "cron", force });
  return NextResponse.json(stats);
}

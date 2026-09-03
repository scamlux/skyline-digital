import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { orchestrate } from "@/lib/radar/orchestrate";
import { loadQueries } from "@/lib/radar/queries";

// Radar scan trigger — lives under /admin so the proxy's Basic-Auth gate
// covers it. One industry per invocation (a full sweep would blow the
// serverless time budget); the panel runs industries sequentially if needed.
export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request): Promise<NextResponse> {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "supabase not configured" }, { status: 503 });
  }
  let industry: string;
  try {
    const body = (await req.json()) as { industry?: string };
    industry = String(body.industry ?? "");
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const db = getSupabaseAdmin();
  const queries = await loadQueries(db);
  const query = queries.find((q) => q.key === industry);
  if (!query) {
    return NextResponse.json({ error: `unknown industry: ${industry}` }, { status: 400 });
  }

  const log: string[] = [];
  const summaries = await orchestrate({
    sources: ["google", "geoapify"], // API-only: scrapers need a real browser
    industries: [query.key],
    queries: new Map(queries.map((q) => [q.key, q])),
    region: "uz",
    dryRun: false,
    db,
    concurrency: 10,
    log: (m) => log.push(m),
  });
  const s = summaries[0];
  return NextResponse.json({
    industry: s.industry,
    found: s.found,
    unique: s.unique,
    grades: s.grades,
    new: s.new,
    updated: s.updated,
    errors: s.errors.slice(0, 5),
  });
}

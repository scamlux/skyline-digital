import { NextResponse } from "next/server";
import { auditRequestSchema } from "@/lib/validation/audit";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { measureSite } from "@/lib/audit/measure";
import { scoreMeasurement } from "@/lib/audit/score";
import { persistAudit, toApiResult } from "@/lib/audit/store";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";

// Puppeteer needs the Node runtime; a measurement is capped at 20s internally.
export const runtime = "nodejs";
export const maxDuration = 30;

/** Fast public audit — score + top-3 findings, no e-mail. */
export async function POST(request: Request) {
  // 10 measurements per IP per hour (§3).
  if (!(await rateLimit(`audit:${clientIp(request)}`, { limit: 10, windowMs: 60 * 60_000 }))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = auditRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const measurement = await measureSite(parsed.data.url, { screenshot: false });
  const score = measurement.reachable ? scoreMeasurement(measurement) : null;

  if (isSupabaseConfigured()) {
    await persistAudit(getSupabaseAdmin(), measurement, score, { source: "public" });
  }

  return NextResponse.json(toApiResult(measurement, score, "fast"));
}

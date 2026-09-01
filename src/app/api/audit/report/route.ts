import { NextResponse } from "next/server";
import { auditReportRequestSchema } from "@/lib/validation/audit";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { measureSite } from "@/lib/audit/measure";
import { scoreMeasurement } from "@/lib/audit/score";
import { persistAudit, toApiResult } from "@/lib/audit/store";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { createLead, notifyNewLead } from "@/lib/leads";

export const runtime = "nodejs";
export const maxDuration = 30;

/** Full report: all findings + screenshot, and it captures a lead. */
export async function POST(request: Request) {
  if (!(await rateLimit(`audit:${clientIp(request)}`, { limit: 10, windowMs: 60 * 60_000 }))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = auditReportRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }
  const d = parsed.data;

  // Captcha before any measurement or storage (skipped when unconfigured).
  const captcha = await verifyTurnstile(d.turnstileToken, clientIp(request));
  if (!captcha.ok) {
    return NextResponse.json({ error: "Captcha failed" }, { status: 403 });
  }

  const measurement = await measureSite(d.url, { screenshot: true });
  const score = measurement.reachable ? scoreMeasurement(measurement) : null;

  // Reachable audits create a lead + Telegram notification + stored history.
  if (measurement.reachable && score && isSupabaseConfigured()) {
    const top = score.findings[0]?.id ?? null;
    const supabase = getSupabaseAdmin();
    try {
      const lead = await createLead(supabase, {
        client_name: d.name || undefined,
        email: d.email,
        description: `Аудит ${measurement.host}: ${score.grade} (${score.total}/100)`,
        ai_summary: top ? `Топ-проблема: ${top}` : undefined,
        source: d.source || "audit",
        utm_source: d.utm_source,
        utm_medium: d.utm_medium,
        utm_campaign: d.utm_campaign,
        utm_content: d.utm_content,
        landing_page: d.landing_page,
        referrer: d.referrer,
      });
      await notifyNewLead(supabase, lead);
      await persistAudit(supabase, measurement, score, {
        source: "public",
        email: d.email,
        leadId: lead.id,
      });
    } catch (err) {
      // Lead/notification failure must not lose the user's report.
      console.error("[audit/report] lead pipeline failed:", err instanceof Error ? err.message : err);
    }
  }

  return NextResponse.json(toApiResult(measurement, score, "report"));
}

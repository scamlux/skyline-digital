import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditApiResult, AuditScore, Measurement } from "./types";

/**
 * Persist an audit row (migration 0005). Best-effort: a failure here (e.g. the
 * migration not yet applied) never breaks the response — the audit result and
 * any lead still reach the user. Returns the row id, or null on failure.
 */
export async function persistAudit(
  supabase: SupabaseClient,
  measurement: Measurement,
  score: AuditScore | null,
  opts: { source: "public" | "radar"; email?: string | null; leadId?: string | null },
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("audits")
      .insert({
        url: measurement.url,
        host: measurement.host,
        final_url: measurement.finalUrl,
        reachable: measurement.reachable,
        error_code: measurement.error ?? null,
        score_total: score?.total ?? null,
        score_grade: score?.grade ?? null,
        categories: score?.categories ?? null,
        measurement,
        findings: score?.findings ?? null,
        email: opts.email ?? null,
        lead_id: opts.leadId ?? null,
        source: opts.source,
      })
      .select("id")
      .single();
    if (error) {
      console.error("[audit] persist failed:", error.message);
      return null;
    }
    return (data as { id: string }).id;
  } catch (err) {
    console.error("[audit] persist threw:", err instanceof Error ? err.message : err);
    return null;
  }
}

/** Shape a measurement + score into the API response. */
export function toApiResult(
  measurement: Measurement,
  score: AuditScore | null,
  mode: "fast" | "report",
): AuditApiResult {
  if (!measurement.reachable || !score) {
    return {
      reachable: false,
      host: measurement.host,
      finalUrl: measurement.finalUrl,
      error: measurement.error,
    };
  }
  return {
    reachable: true,
    host: measurement.host,
    finalUrl: measurement.finalUrl,
    score: {
      total: score.total,
      grade: score.grade,
      categories: score.categories,
      findings: mode === "fast" ? score.findings.slice(0, 3) : score.findings,
    },
    ...(mode === "report" ? { screenshot: measurement.mobile.screenshotMobile } : {}),
  };
}

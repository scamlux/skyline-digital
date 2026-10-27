import "server-only";
import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditApiResult, AuditScore, CategoryScore, Finding, Grade, Measurement, ScoreCategory } from "./types";

/** Unguessable share token (32 hex chars, §11: 32+ characters). */
export function newShareToken(): string {
  return randomBytes(16).toString("hex");
}

export interface PersistOptions {
  source: "public" | "radar";
  email?: string | null;
  leadId?: string | null;
  /** Make the report reachable at /audit/r/<token>. */
  share?: boolean;
  /** Radar batch run id. */
  batchId?: string | null;
}

/** What a successful persist returns. */
export interface Persisted {
  id: string;
  shareToken: string | null;
}

/**
 * Persist an audit row (migrations 0005 + 0015). Best-effort: a failure here
 * (e.g. a migration not yet applied) never breaks the response — the audit
 * result and any lead still reach the user. Returns null on failure.
 *
 * The mobile screenshot is stored in its own column, NOT inside `measurement`,
 * so list queries never pull megabytes of base64. If the 0015 columns are
 * missing, it retries with the 0005 shape so production keeps recording.
 */
export async function persistAudit(
  supabase: SupabaseClient,
  measurement: Measurement,
  score: AuditScore | null,
  opts: PersistOptions,
): Promise<Persisted | null> {
  const screenshot = measurement.mobile.screenshotMobile;
  const leanMeasurement: Measurement = {
    ...measurement,
    mobile: { ...measurement.mobile, screenshotMobile: null },
  };
  const shareToken = opts.share ? newShareToken() : null;
  const base = {
    url: measurement.url,
    host: measurement.host,
    final_url: measurement.finalUrl,
    reachable: measurement.reachable,
    error_code: measurement.error ?? null,
    score_total: score?.total ?? null,
    score_grade: score?.grade ?? null,
    categories: score?.categories ?? null,
    measurement: leanMeasurement,
    findings: score?.findings ?? null,
    email: opts.email ?? null,
    lead_id: opts.leadId ?? null,
    source: opts.source,
  };
  const v2 = {
    ...base,
    engine_version: measurement.engineVersion ?? null,
    score_version: score?.version ?? null,
    share_token: shareToken,
    screenshot,
    batch_id: opts.batchId ?? null,
  };

  try {
    let res = await supabase.from("audits").insert(v2).select("id").single();
    // 42703 = undefined_column / PGRST204 = column missing from the schema
    // cache: migration 0015 isn't applied yet — fall back to the 0005 shape.
    if (res.error && /42703|PGRST204/.test(String(res.error.code))) {
      res = await supabase.from("audits").insert(base).select("id").single();
      if (!res.error) return { id: (res.data as { id: string }).id, shareToken: null };
    }
    if (res.error) {
      console.error("[audit] persist failed:", res.error.message);
      return null;
    }
    return { id: (res.data as { id: string }).id, shareToken };
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
  token?: string | null,
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
      version: score.version,
      total: score.total,
      grade: score.grade,
      categories: score.categories,
      findings: mode === "fast" ? score.findings.slice(0, 3) : score.findings,
    },
    ...(mode === "report" ? { screenshot: measurement.mobile.screenshotMobile } : {}),
    ...(token ? { token } : {}),
    ...(measurement.tools ? { tools: measurement.tools } : {}),
  };
}

/** One earlier audit of the same host, for the history strip. */
export interface HistoryPoint {
  createdAt: string;
  total: number;
  grade: string;
}

/** A stored report as the share page needs it. */
export interface SharedReport {
  result: AuditApiResult;
  createdAt: string;
  /** Earlier audits of the same host with the same score version, newest first. */
  history: HistoryPoint[];
}

interface StoredRow {
  host: string;
  final_url: string | null;
  reachable: boolean;
  error_code: string | null;
  score_total: number | null;
  score_grade: string | null;
  score_version: string | null;
  categories: Partial<Record<ScoreCategory, CategoryScore>> | null;
  findings: Finding[] | null;
  screenshot: string | null;
  created_at: string;
  tools: Measurement["tools"] | null;
}

/**
 * Earlier reachable audits of a host, comparable to `scoreVersion` (v1 totals
 * and v2 totals measure different things — never mixed).
 */
export async function hostHistory(
  supabase: SupabaseClient,
  host: string,
  before: string,
  scoreVersion: string | null,
  limit = 5,
): Promise<HistoryPoint[]> {
  const { data } = await supabase
    .from("audits")
    .select("score_total,score_grade,created_at,score_version")
    .eq("host", host)
    .eq("reachable", true)
    .lt("created_at", before)
    .order("created_at", { ascending: false })
    .limit(20);
  return (data ?? [])
    .filter((p) => p.score_total != null && (p.score_version ?? null) === scoreVersion)
    .slice(0, limit)
    .map((p) => ({ createdAt: p.created_at as string, total: p.score_total as number, grade: (p.score_grade ?? "") as string }));
}

/**
 * Load a shared report by exact token. Old rows (score v1, 4 categories, no
 * engine version) still render — every reader tolerates missing fields.
 */
export async function loadSharedReport(supabase: SupabaseClient, token: string): Promise<SharedReport | null> {
  if (!/^[a-f0-9]{32}$/.test(token)) return null;
  const { data, error } = await supabase
    .from("audits")
    .select(
      "host,final_url,reachable,error_code,score_total,score_grade,score_version,categories,findings,screenshot,created_at,tools:measurement->tools",
    )
    .eq("share_token", token)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as StoredRow;
  const history = await hostHistory(supabase, row.host, row.created_at, row.score_version);

  const result: AuditApiResult =
    row.reachable && row.score_total != null && row.categories
      ? {
          reachable: true,
          host: row.host,
          finalUrl: row.final_url ?? row.host,
          score: {
            version: row.score_version ?? undefined,
            total: row.score_total,
            grade: (row.score_grade ?? "F") as Grade,
            categories: row.categories,
            findings: row.findings ?? [],
          },
          screenshot: row.screenshot,
          token,
          ...(row.tools ? { tools: row.tools } : {}),
        }
      : {
          reachable: false,
          host: row.host,
          finalUrl: row.final_url ?? row.host,
          error: (row.error_code ?? "HTTP_ERROR") as AuditApiResult["error"],
        };
  if (result.score) {
    const bench = await industryBenchmark(supabase, row.host, result.score.total, result.score.version).catch(() => null);
    if (bench) result.benchmark = bench;
  }
  return { result, createdAt: row.created_at, history };
}

/** Minimum comparable audits before an industry comparison is shown. */
export const BENCHMARK_MIN_N = 20;

/** Pure: share of `peers` strictly below `total`, rounded. */
export function percentileBelow(total: number, peers: number[]): number {
  if (!peers.length) return 0;
  return Math.round((100 * peers.filter((p) => p < total).length) / peers.length);
}

/**
 * "Better than X% of <industry> sites": compares with the latest radar audit
 * of each company in that industry, same scoreVersion only. Returns null when
 * fewer than {@link BENCHMARK_MIN_N} comparable audits exist — a percentage
 * over 6 sites would be noise dressed as a fact.
 */
export async function industryBenchmark(
  supabase: SupabaseClient,
  host: string,
  total: number,
  scoreVersion: string | undefined,
): Promise<{ industry: string; betterThanPct: number; n: number } | null> {
  if (!scoreVersion) return null;
  const { data: company } = await supabase
    .from("radar_companies")
    .select("industry")
    .or(`domain.eq.${host},website.ilike.%${host.replace(/[%,()]/g, "")}%`)
    .not("industry", "is", null)
    .limit(1)
    .maybeSingle();
  const industry = (company?.industry as string | undefined) ?? null;
  if (!industry) return null;
  const { data: peers } = await supabase
    .from("radar_companies")
    .select("audit_score")
    .eq("industry", industry)
    .not("audit_score", "is", null)
    .limit(2000);
  const scores = (peers ?? []).map((p) => p.audit_score as number);
  if (scores.length < BENCHMARK_MIN_N) return null;
  // Human label from the editable radar queries (ru); the key is the fallback.
  const { data: q } = await supabase.from("radar_queries").select("label").eq("key", industry).maybeSingle();
  const label = (q?.label as string | undefined) ?? industry;
  return { industry: label, betterThanPct: percentileBelow(total, scores), n: scores.length };
}

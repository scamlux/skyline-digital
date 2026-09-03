import type { SupabaseClient } from "@supabase/supabase-js";
import type { Company, Grade, Industry, RadarSource, Region, Signals, WebStatus } from "./types";
import { normalizeCompanyName, SOURCE_RANK } from "./dedupe";

/**
 * Idempotent persistence for radar leads (docs/adr/0002-radar-engine.md).
 *
 * The Supabase client is injected so the same code runs inside Next (admin,
 * via getSupabaseAdmin) and from the plain-node CLI (via getRadarDb). Upsert
 * keys on `phone`; because scoring is deterministic, re-running produces the
 * same row — only `updated_at`/`verified_at` move. Companies without a usable
 * phone are skipped (an uncontactable lead isn't a lead) and counted.
 */

export interface ScoredCompany extends Company {
  signals: Signals;
  webStatus: WebStatus;
  grade: Grade;
}

export interface UpsertResult {
  new: number;
  updated: number;
  skipped: number;
  errors: string[];
}

function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function toRow(c: ScoredCompany, now: string, region: Region): Record<string, unknown> {
  return {
    name: c.name,
    name_normalized: normalizeCompanyName(c.name),
    region,
    phone: c.phone,
    industry: c.industry,
    city: c.city,
    website: c.website,
    domain: hostOf(c.website),
    email: c.email,
    social_links: c.socialLinks ?? [],
    signals: c.signals,
    web_status: c.webStatus,
    grade: c.grade,
    class: c.grade, // legacy 0005 column, kept in sync
    source: c.source,
    directory: c.source, // legacy 0005 column, kept in sync
    has_site: Boolean(c.website),
    geo: c.geo,
    verified_at: now,
    updated_at: now,
  };
}

export async function upsertCompanies(
  db: SupabaseClient,
  companies: ScoredCompany[],
  region: Region = "uz",
  now: string = new Date().toISOString(),
): Promise<UpsertResult> {
  const errors: string[] = [];
  // Collapse same-phone rows inside the batch: greedy dedupe can leave two
  // clusters converging on one phone (a null-phone cluster acquires the number
  // during merge), and Postgres rejects a batch that hits the same unique key
  // twice ("ON CONFLICT DO UPDATE cannot affect row a second time").
  const byPhone = new Map<string, ScoredCompany>();
  let skipped = 0;
  for (const c of companies) {
    if (!c.phone) {
      skipped++;
      continue;
    }
    if (!byPhone.has(c.phone)) byPhone.set(c.phone, c);
  }
  const valid = [...byPhone.values()];
  if (valid.length === 0) return { new: 0, updated: 0, skipped, errors };

  const phones = valid.map((c) => c.phone as string);
  const { data: existing, error: selErr } = await db
    .from("radar_companies")
    .select("phone, source, industry")
    .in("phone", phones);
  if (selErr) errors.push(`select: ${selErr.message}`);
  const existingBy = new Map(
    (existing ?? []).map((r: { phone: string; source: string | null; industry: string | null }) => [
      r.phone,
      r,
    ]),
  );

  // Cross-source duplicate guard: a lower-ranked source (geoapify/scrapers)
  // must never overwrite a row already filled by a higher-ranked one (google).
  const rank = (s: string | null | undefined): number =>
    SOURCE_RANK[(s ?? "") as RadarSource] ?? 0;
  const writable = valid.filter((c) => {
    const prev = existingBy.get(c.phone as string);
    return prev === undefined || rank(c.source) >= rank(prev.source);
  });
  const protectedCount = valid.length - writable.length;
  if (writable.length === 0) return { new: 0, updated: 0, skipped: skipped + protectedCount, errors };

  const rows = writable.map((c) => {
    const row = toRow(c, now, region);
    // Industry labels must not flap between runs: a company keeps the industry
    // it was first discovered under (later same-phone claims from other
    // industry queries update signals/contacts but not the label).
    const prev = existingBy.get(c.phone as string);
    if (prev?.industry) row.industry = prev.industry;
    return row;
  });
  const { error: upErr } = await db
    .from("radar_companies")
    .upsert(rows, { onConflict: "phone" });
  if (upErr) {
    errors.push(`upsert: ${upErr.message}`);
    return { new: 0, updated: 0, skipped, errors };
  }
  const isNew = writable.filter((c) => !existingBy.has(c.phone as string)).length;
  return {
    new: isNew,
    updated: writable.length - isNew,
    skipped: skipped + protectedCount,
    errors,
  };
}

// ── radar_runs bookkeeping ─────────────────────────────────────────────────

export async function startRun(
  db: SupabaseClient,
  industry: Industry | "all",
  source: string,
): Promise<string | null> {
  const { data, error } = await db
    .from("radar_runs")
    .insert({ industry, source, status: "running" })
    .select("id")
    .single();
  if (error) return null;
  return (data as { id: string }).id;
}

export async function finishRun(
  db: SupabaseClient,
  id: string | null,
  patch: {
    status: "success" | "failed";
    companies_found?: number;
    companies_new?: number;
    companies_updated?: number;
    error_message?: string;
    duration_seconds?: number;
  },
): Promise<void> {
  if (!id) return;
  await db
    .from("radar_runs")
    .update({ ...patch, ended_at: new Date().toISOString() })
    .eq("id", id);
}

// ── stats (CLI --stats and admin) ──────────────────────────────────────────

export interface RadarStats {
  total: number;
  byGrade: Record<Grade, number>;
  byIndustry: Record<string, number>;
}

export async function getStats(db: SupabaseClient): Promise<RadarStats> {
  // PostgREST caps a single select at 1000 rows — page through explicitly so
  // stats stay correct as the base grows past that.
  const PAGE = 1000;
  const byGrade: Record<Grade, number> = { A: 0, B: 0, C: 0 };
  const byIndustry: Record<string, number> = {};
  let total = 0;
  for (let from = 0; ; from += PAGE) {
    const { data } = await db
      .from("radar_companies")
      .select("grade, industry")
      .eq("discarded", false)
      .range(from, from + PAGE - 1);
    const rows = (data ?? []) as { grade: Grade | null; industry: string | null }[];
    for (const r of rows) {
      total++;
      if (r.grade && r.grade in byGrade) byGrade[r.grade]++;
      if (r.industry) byIndustry[r.industry] = (byIndustry[r.industry] ?? 0) + 1;
    }
    if (rows.length < PAGE) break;
  }
  return { total, byGrade, byIndustry };
}

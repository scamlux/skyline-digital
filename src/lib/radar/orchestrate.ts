import type { SupabaseClient } from "@supabase/supabase-js";
import type { Company, Grade, Industry, RadarSource, Region } from "./types";
import { createCollector } from "./factory";
import { dedupe } from "./dedupe";
import { baseSignals, scoreCompany } from "./score";
import { enrichCompany } from "./signals";
import { upsertCompanies, startRun, finishRun, type ScoredCompany } from "./store";

/** Bounded-concurrency map — keeps enrichment fetches from stampeding. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length || 1) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return out;
}

export interface OrchestrateConfig {
  sources: RadarSource[];
  industries: Industry[];
  region: Region;
  dryRun: boolean;
  db?: SupabaseClient | null;
  log?: (m: string) => void;
  /** Fetch each company's site to score signals (default true). */
  enrich?: boolean;
  concurrency?: number;
  /** Wall-clock now, injected for deterministic tests. */
  now?: () => number;
}

export interface IndustrySummary {
  industry: Industry;
  found: number;
  unique: number;
  grades: Record<Grade, number>;
  new: number;
  updated: number;
  perSource: Partial<Record<RadarSource, number>>;
  errors: string[];
}

/** Run collectors → dedupe → enrich → score → (upsert) for each industry. */
export async function orchestrate(cfg: OrchestrateConfig): Promise<IndustrySummary[]> {
  const log = cfg.log ?? (() => {});
  const now = cfg.now ?? Date.now;
  const summaries: IndustrySummary[] = [];

  for (const industry of cfg.industries) {
    const startedMs = now();
    const runId =
      cfg.db && !cfg.dryRun ? await startRun(cfg.db, industry, cfg.sources.join("+")) : null;

    const raw: Company[] = [];
    const errors: string[] = [];
    const perSource: Partial<Record<RadarSource, number>> = {};

    for (const source of cfg.sources) {
      const collector = createCollector(source);
      if (!collector) {
        log(`[orchestrate] no collector for ${source}`);
        continue;
      }
      const res = await collector.run(industry, { log, region: cfg.region });
      raw.push(...res.companies);
      perSource[source] = res.companies.length;
      errors.push(...res.errors);
      log(`  ${industry} + ${source}: found ${res.companies.length}`);
    }

    const unique = dedupe(raw);
    const enrichOn = cfg.enrich ?? true;
    const scored: ScoredCompany[] = await mapLimit(unique, cfg.concurrency ?? 8, async (c) => {
      const { signals, webStatus } = enrichOn
        ? await enrichCompany(c)
        : { signals: baseSignals(c), webStatus: "no_site" as const };
      return { ...c, signals, webStatus, grade: scoreCompany(signals) };
    });

    const grades: Record<Grade, number> = { A: 0, B: 0, C: 0 };
    for (const s of scored) grades[s.grade]++;

    let created = 0;
    let updated = 0;
    if (!cfg.dryRun && cfg.db) {
      const r = await upsertCompanies(cfg.db, scored, cfg.region);
      created = r.new;
      updated = r.updated;
      errors.push(...r.errors);
    }

    if (runId && cfg.db) {
      await finishRun(cfg.db, runId, {
        status: errors.length && scored.length === 0 ? "failed" : "success",
        companies_found: raw.length,
        companies_new: created,
        companies_updated: updated,
        error_message: errors.slice(0, 5).join("; ") || undefined,
        duration_seconds: Math.round((now() - startedMs) / 1000),
      });
    }

    summaries.push({ industry, found: raw.length, unique: unique.length, grades, new: created, updated, perSource, errors });
    log(
      `  ${industry}: ${raw.length} found → ${unique.length} unique · A=${grades.A} B=${grades.B} C=${grades.C} · ` +
        (cfg.dryRun ? "(dry-run)" : `upserted ${created} new / ${updated} updated`),
    );
  }
  return summaries;
}

/**
 * Audit bench — replays the production audit engine over a fixed, seeded
 * sample of radar sites and writes an aggregate summary, so every engine or
 * scoring change can be compared against a baseline (coverage, error mix,
 * grade distribution, finding frequencies, time per audit).
 *
 *   npm run audit:bench -- [options]
 *     --n <count>         sample size (default 150)
 *     --conc <count>      parallel browsers (default 2 — keep it fixed between runs)
 *     --seed <int>        shuffle seed (default 42)
 *     --label <name>      summary name → scripts/audit/baselines/<label>.json
 *     --raw <path>        also write per-site JSONL (NOT committed — contains URLs)
 *
 * Only aggregates are written to the repo; per-site rows stay local. Runs via
 * tsx with the react-server condition so `server-only` resolves outside Next.
 */
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { measureSite } from "../../src/lib/audit/measure";
import { scoreMeasurement } from "../../src/lib/audit/score";

interface Args {
  n: number;
  conc: number;
  seed: number;
  label: string;
  raw?: string;
}

function parseArgs(argv: string[]): Args {
  const a: Args = { n: 150, conc: 2, seed: 42, label: "run" };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const v = argv[i + 1];
    if (v === undefined) continue;
    if (flag === "--n") a.n = Number(v);
    else if (flag === "--conc") a.conc = Number(v);
    else if (flag === "--seed") a.seed = Number(v);
    else if (flag === "--label") a.label = v;
    else if (flag === "--raw") a.raw = v;
    else continue;
    i++;
  }
  return a;
}

/** Deterministic LCG shuffle so the same seed always yields the same sample. */
function shuffle<T>(arr: T[], seed: number): T[] {
  let s = seed;
  const rnd = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

interface Row {
  industry: string | null;
  ms: number;
  reachable: boolean;
  error: string | null;
  total: number | null;
  grade: string | null;
  categories: Record<string, number> | null;
  findings: string[];
  signals: Record<string, boolean>;
  lcp: number | null;
  engineVersion: string | null;
}

const pct = (x: number, t: number) => (t ? Math.round((1000 * x) / t) / 10 : 0);
const quantile = (sorted: number[], q: number) =>
  sorted.length ? sorted[Math.floor(q * (sorted.length - 1))] : null;
function countBy<T>(xs: T[], key: (x: T) => string): Record<string, number> {
  const m: Record<string, number> = {};
  for (const x of xs) m[key(x)] = (m[key(x)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(m).sort((a, b) => b[1] - a[1]));
}

function summarize(rows: Row[], args: Args, wallMs: number) {
  const ok = rows.filter((r) => r.reachable && r.total != null);
  const scores = ok.map((r) => r.total!).sort((a, b) => a - b);
  const cats = [...new Set(ok.flatMap((r) => Object.keys(r.categories ?? {})))];
  const findingFreq: Record<string, number> = {};
  for (const r of ok) for (const f of new Set(r.findings)) findingFreq[f] = (findingFreq[f] ?? 0) + 1;
  const signalKeys = [...new Set(ok.flatMap((r) => Object.keys(r.signals)))];
  const ms = rows.map((r) => r.ms).sort((a, b) => a - b);
  const lcp = ok.map((r) => r.lcp).filter((x): x is number => x != null).sort((a, b) => a - b);
  return {
    label: args.label,
    date: new Date().toISOString(),
    engineVersion: ok[0]?.engineVersion ?? rows[0]?.engineVersion ?? null,
    sample: { n: rows.length, seed: args.seed, conc: args.conc, pool: "radar web_status=ok" },
    coveragePct: pct(ok.length, rows.length),
    errors: countBy(rows.filter((r) => !r.reachable), (r) => r.error ?? "UNKNOWN"),
    grades: countBy(ok, (r) => r.grade ?? "?"),
    score: {
      p10: quantile(scores, 0.1),
      p25: quantile(scores, 0.25),
      median: quantile(scores, 0.5),
      p75: quantile(scores, 0.75),
      p90: quantile(scores, 0.9),
    },
    categoryMedian: Object.fromEntries(
      cats.map((c) => {
        const v = ok.map((r) => r.categories?.[c]).filter((x): x is number => x != null).sort((a, b) => a - b);
        return [c, quantile(v, 0.5)];
      }),
    ),
    findingPct: Object.fromEntries(
      Object.entries(findingFreq).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, pct(v, ok.length)]),
    ),
    signalPct: Object.fromEntries(signalKeys.map((k) => [k, pct(ok.filter((r) => r.signals[k]).length, ok.length)])),
    lcpMs: { median: quantile(lcp, 0.5), p75: quantile(lcp, 0.75) },
    msPerAudit: { median: quantile(ms, 0.5), p90: quantile(ms, 0.9) },
    wallSeconds: Math.round(wallMs / 1000),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing");
  const db = createClient(url, key, { auth: { persistSession: false } });

  const pool: { id: string; website: string; industry: string | null }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from("radar_companies")
      .select("id,website,industry")
      .eq("web_status", "ok")
      .order("id")
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    pool.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  const sample = shuffle(pool, args.seed).slice(0, args.n);
  console.log(`pool ${pool.length}, sample ${sample.length}, conc ${args.conc}`);
  if (args.raw) {
    mkdirSync(dirname(args.raw), { recursive: true });
    writeFileSync(args.raw, "");
  }

  const rows: Row[] = [];
  let next = 0;
  const t0 = Date.now();
  async function worker() {
    while (next < sample.length) {
      const c = sample[next++];
      const started = Date.now();
      let row: Row;
      let lastMeasurement: unknown = null;
      try {
        const m = await measureSite(c.website, { screenshot: false });
        lastMeasurement = m;
        const s = m.reachable ? scoreMeasurement(m) : null;
        row = {
          industry: c.industry,
          ms: Date.now() - started,
          reachable: m.reachable,
          error: m.error ?? null,
          total: s?.total ?? null,
          grade: s?.grade ?? null,
          categories: s ? Object.fromEntries(Object.entries(s.categories).map(([k, v]) => [k, v.score])) : null,
          findings: s?.findings.map((f) => f.id) ?? [],
          signals: m.reachable
            ? {
                contactForm: m.business.hasContactForm,
                phoneLink: m.business.hasPhoneLink,
                messenger: m.business.hasMessengerLink,
                analytics: m.business.hasAnalytics,
              }
            : {},
          lcp: m.speed.lcp,
          engineVersion: (m as { engineVersion?: string }).engineVersion ?? null,
        };
      } catch (err) {
        row = {
          industry: c.industry, ms: Date.now() - started, reachable: false,
          error: `CRASH: ${err instanceof Error ? err.message.slice(0, 80) : String(err)}`,
          total: null, grade: null, categories: null, findings: [], signals: {}, lcp: null, engineVersion: null,
        };
      }
      rows.push(row);
      // Raw rows keep the full measurement (minus the screenshot) so scoring
      // can be recalibrated offline with `--rescore` without re-measuring.
      if (args.raw) appendFileSync(args.raw, JSON.stringify({ url: c.website, ...row, measurement: lastMeasurement }) + "\n");
      if (rows.length % 10 === 0) console.log(`${rows.length}/${sample.length} · ${Math.round((Date.now() - t0) / 1000)}s`);
    }
  }
  await Promise.all(Array.from({ length: args.conc }, worker));

  const summary = summarize(rows, args, Date.now() - t0);
  const out = join("scripts/audit/baselines", `${args.label}.json`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(summary, null, 2) + "\n");
  console.log(JSON.stringify({ coveragePct: summary.coveragePct, errors: summary.errors, grades: summary.grades, score: summary.score, msPerAudit: summary.msPerAudit }, null, 2));
  console.log(`→ ${out}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

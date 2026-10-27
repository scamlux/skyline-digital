/**
 * Radar audit batch — runs the production audit engine over radar companies
 * that have a website, stores each result as an `audits` row (source='radar',
 * with a share token) and syncs the company: last_audit_id, last_audit_at,
 * audit_score, audit_grade — and fills EMPTY instagram / email / social_links
 * from contacts found on the company's own site. Every company then has a
 * personal report link and, often, a channel to send it through.
 *
 *   npm run audit:radar -- [options]
 *     --limit <n>         companies this run (default 50)
 *     --conc <n>          parallel browsers (default 2)
 *     --industry <name>   only this industry
 *     --city <name>       only this city
 *     --stale-days <n>    re-audit only if the last audit is older (default 30)
 *     --screenshots       also store the mobile screenshot (~100 KB each;
 *                         off by default — the Supabase free tier is 500 MB)
 *     --dry-run           measure + score, print, write nothing
 *
 * LOCAL ONLY (needs Chrome; never on Vercel). Requires migration 0015.
 * Measurements are made with the same engine and budget as the public report.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { measureSite } from "../../src/lib/audit/measure";
import { scoreMeasurement } from "../../src/lib/audit/score";
import { persistAudit } from "../../src/lib/audit/store";
import { normalizeWebsite } from "../../src/lib/radar/validate";
import { contactsFill } from "../../src/lib/radar/contacts";

interface Args {
  limit: number;
  conc: number;
  industry?: string;
  city?: string;
  staleDays: number;
  dryRun: boolean;
  screenshots: boolean;
}

function parseArgs(argv: string[]): Args {
  const a: Args = { limit: 50, conc: 2, staleDays: 30, dryRun: false, screenshots: false };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === "--dry-run") {
      a.dryRun = true;
      continue;
    }
    if (flag === "--screenshots") {
      a.screenshots = true;
      continue;
    }
    const v = argv[i + 1];
    if (v === undefined) continue;
    if (flag === "--limit") a.limit = Number(v);
    else if (flag === "--conc") a.conc = Number(v);
    else if (flag === "--industry") a.industry = v;
    else if (flag === "--city") a.city = v;
    else if (flag === "--stale-days") a.staleDays = Number(v);
    else continue;
    i++;
  }
  return a;
}

interface Company {
  id: string;
  name: string;
  website: string;
  industry: string | null;
  city: string | null;
  last_audit_at: string | null;
  instagram: string | null;
  email: string | null;
  social_links: string[] | null;
}

async function pickCompanies(db: SupabaseClient, a: Args): Promise<Company[]> {
  const cutoff = new Date(Date.now() - a.staleDays * 86_400_000).toISOString();
  let q = db
    .from("radar_companies")
    .select("id,name,website,industry,city,last_audit_at,instagram,email,social_links")
    .eq("has_site", true)
    .eq("discarded", false)
    .not("website", "is", null)
    .or(`last_audit_at.is.null,last_audit_at.lt.${cutoff}`)
    // Never-audited first, then the stalest.
    .order("last_audit_at", { ascending: true, nullsFirst: true })
    .limit(a.limit);
  if (a.industry) q = q.eq("industry", a.industry);
  if (a.city) q = q.eq("city", a.city);
  const { data, error } = await q;
  if (error) throw new Error(`radar query failed: ${error.message} (is migration 0015 applied?)`);
  return (data ?? []) as Company[];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing");
  const db = createClient(url, key, { auth: { persistSession: false } });

  const companies = await pickCompanies(db, args);
  const batchId = `radar-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "")}`;
  console.log(`batch ${batchId}: ${companies.length} companies, conc ${args.conc}${args.dryRun ? " (dry run)" : ""}`);

  const tally = { audited: 0, unreachable: 0, skipped: 0, failed: 0, gotInstagram: 0, gotEmail: 0 };
  const grades: Record<string, number> = {};
  let next = 0;
  async function worker() {
    while (next < companies.length) {
      const c = companies[next++];
      const site = normalizeWebsite(c.website);
      if (!site) {
        tally.skipped++;
        console.log(`skip  ${c.name} — not a company site: ${c.website}`);
        // Stamp it, so a page we can't audit (Taplink, Booking…) doesn't head
        // every following batch as "never audited".
        if (!args.dryRun) {
          await db.from("radar_companies").update({ last_audit_at: new Date().toISOString() }).eq("id", c.id);
        }
        continue;
      }
      try {
        const m = await measureSite(site, { screenshot: args.screenshots, budgetMs: 45_000, tools: "full" });
        const s = m.reachable ? scoreMeasurement(m) : null;
        const label = s ? `${s.grade} ${s.total}` : `✗ ${m.error}`;
        console.log(`${s ? "ok   " : "down "} ${c.name} · ${m.host} · ${label}`);
        if (s) grades[s.grade] = (grades[s.grade] ?? 0) + 1;
        if (s) tally.audited++;
        else tally.unreachable++;
        if (args.dryRun) continue;

        const saved = await persistAudit(db, m, s, { source: "radar", share: Boolean(s), batchId });
        const update: Record<string, unknown> = {
          last_audit_id: saved?.id ?? null,
          last_audit_at: new Date().toISOString(),
          audit_score: s?.total ?? null,
          audit_grade: s?.grade ?? null,
          ...contactsFill(c, m.tools?.presence),
        };
        if (update.instagram) tally.gotInstagram++;
        if (update.email) tally.gotEmail++;
        const { error } = await db.from("radar_companies").update(update).eq("id", c.id);
        if (error) console.error(`  ! company update failed: ${error.message}`);
      } catch (err) {
        tally.failed++;
        console.error(`fail  ${c.name}: ${err instanceof Error ? err.message : err}`);
      }
    }
  }
  await Promise.all(Array.from({ length: args.conc }, worker));
  console.log(JSON.stringify({ batchId, ...tally, grades }, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

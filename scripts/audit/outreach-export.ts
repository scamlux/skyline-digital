/**
 * Outreach export: radar companies with a weak audit (C/D/F) and at least one
 * written channel (instagram / t.me / wa.me / email) → CSV for experiment E1
 * ("personal audit report opens a conversation with the owner").
 * READ-ONLY against the DB. The CSV holds business contact data: `exports/`
 * is gitignored, never commit it.
 *
 * npm run audit:outreach -- [options]
 *   --industries a,b,c  only these industries
 *   --top-industries <n> keep only the n industries with most candidates (after dedupe)
 *   --limit <n>         first n rows after sorting by score asc (default: all)
 *   --out <path>        default exports/outreach-<YYYY-MM-DD>.csv
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { contactLooksOff, dedupe, extractChannels, handleOf, hostOf, isBlocked, isUsableEmail, toCsv } from "../../src/lib/radar/outreach";

const SITE = "https://skyline-digital.uz";
const PAGE = 1000;

interface Args {
  industries?: string[];
  limit?: number;
  top?: number;
  out: string;
}

function parseArgs(argv: string[]): Args {
  const a: Args = { out: `exports/outreach-${new Date().toISOString().slice(0, 10)}.csv` };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const v = argv[i + 1];
    if (k === "--industries") {
      a.industries = v.split(",").map((s) => s.trim()).filter(Boolean);
      i++;
    } else if (k === "--limit") {
      a.limit = Math.max(1, parseInt(v, 10) || 1);
      i++;
    } else if (k === "--top-industries") {
      a.top = Math.max(1, parseInt(v, 10) || 1);
      i++;
    } else if (k === "--out") {
      a.out = v;
      i++;
    }
  }
  return a;
}

interface Company {
  id: string;
  name: string | null;
  industry: string | null;
  city: string | null;
  phone: string | null;
  website: string | null;
  instagram: string | null;
  email: string | null;
  social_links: string[] | null;
  last_audit_id: string | null;
  audit_score: number | null;
  audit_grade: string | null;
}
interface Finding {
  id: string;
  impact?: number;
}
interface AuditRow {
  id: string;
  share_token: string | null;
  findings: Finding[] | null;
}

async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    all.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return all;
}

async function loadCompanies(db: SupabaseClient): Promise<Company[]> {
  return fetchAll<Company>((from, to) =>
    db
      .from("radar_companies")
      .select("id,name,industry,city,phone,website,instagram,email,social_links,last_audit_id,audit_score,audit_grade")
      .eq("discarded", false)
      .eq("outreach_status", "NEW")
      .not("audit_score", "is", null)
      .in("audit_grade", ["C", "D", "F"])
      .not("last_audit_id", "is", null)
      .order("id")
      .range(from, to),
  );
}

async function loadAudits(db: SupabaseClient, ids: string[]): Promise<Map<string, AuditRow>> {
  const map = new Map<string, AuditRow>();
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const { data, error } = await db.from("audits").select("id,share_token,findings").in("id", chunk);
    if (error) throw new Error(error.message);
    for (const r of (data ?? []) as AuditRow[]) map.set(r.id, r);
  }
  return map;
}

function count<T>(rows: T[], key: (r: T) => string): [string, number][] {
  const m = new Map<string, number>();
  for (const r of rows) m.set(key(r), (m.get(key(r)) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing");
  const db = createClient(url, key, { auth: { persistSession: false } });

  const ru = JSON.parse(readFileSync(resolve("messages/ru.json"), "utf8")) as {
    audit: { findings: Record<string, { title?: string }> };
  };
  const title = (id: string) => ru.audit.findings[id]?.title ?? id;

  let companies = await loadCompanies(db);
  if (args.industries) {
    const set = new Set(args.industries);
    companies = companies.filter((c) => c.industry && set.has(c.industry));
  }
  const audits = await loadAudits(db, [...new Set(companies.map((c) => c.last_audit_id!))]);

  const eligible = companies
    .map((c) => {
      const audit = audits.get(c.last_audit_id!);
      const ch = extractChannels(c.social_links);
      const email = isUsableEmail(c.email) ? c.email!.trim() : "";
      const instagram = c.instagram?.trim() ?? "";
      return { c, audit, ch, email, instagram, name: c.name?.trim() ?? "", score: c.audit_score!, host: hostOf(c.website) };
    })
    .filter((r) => r.audit?.share_token && r.name && (r.instagram || r.ch.telegram || r.ch.whatsapp || r.email));
  const unblocked = eligible.filter((r) => !isBlocked(r.c.website, r.email));
  const blockedN = eligible.length - unblocked.length;
  const merged = dedupe(unblocked);
  const dedupedN = unblocked.length - merged.length;
  let pool = merged.sort((a, b) => a.row.score - b.row.score);
  if (args.industries) {
    const set = new Set(args.industries);
    pool = pool.filter((m) => m.row.c.industry && set.has(m.row.c.industry));
  }
  let topList: string[] | undefined;
  if (args.top) {
    topList = count(pool, (m) => m.row.c.industry ?? "—").slice(0, args.top).map(([k]) => k);
    pool = pool.filter((m) => topList!.includes(m.row.c.industry ?? "—"));
  }
  const picked = args.limit ? pool.slice(0, args.limit) : pool;

  const header = ["name", "industry", "city", "grade", "score", "main_problem", "top3_problems", "website", "instagram", "telegram", "whatsapp", "email", "phone", "contact_check", "branches", "branch_names", "report_url", "pdf_url"];
  let flagged = 0;
  const csvRows = picked.map(({ row: { c, audit, ch, email, instagram, name, host }, branches, branchNames }) => {
    const f = [...(audit!.findings ?? [])].sort((a, b) => (b.impact ?? 0) - (a.impact ?? 0));
    const token = audit!.share_token!;
    const off = contactLooksOff(name, host, [handleOf(instagram), handleOf(ch.telegram)].filter(Boolean));
    if (off) flagged++;
    return [
      name, c.industry, c.city, c.audit_grade, c.audit_score,
      f[0] ? title(f[0].id) : "",
      f.slice(0, 3).map((x) => title(x.id)).join("; "),
      c.website, instagram, ch.telegram, ch.whatsapp, email, c.phone,
      off ? "проверить" : "", branches, branchNames.join("; "),
      `${SITE}/ru/audit/r/${token}`,
      `${SITE}/api/audit/pdf/${token}?locale=ru`,
    ];
  });
  const view = picked.map((m) => m.row);

  const out = resolve(args.out);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, toCsv(header, csvRows), "utf8");

  console.log(`eligible before filters: ${eligible.length}; removed by blocklist: ${blockedN}; removed by dedupe: ${dedupedN}`);
  console.log(`candidates: ${picked.length}${args.limit || args.industries || args.top ? ` (pool ${pool.length})` : ""}${topList ? ` top industries: ${topList.join(", ")}` : ""}`);
  console.log("by industry:", count(view, (r) => r.c.industry ?? "—").map(([k, n]) => `${k}=${n}`).join(", "));
  console.log("by grade:", count(view, (r) => r.c.audit_grade ?? "—").map(([k, n]) => `${k}=${n}`).join(", "));
  console.log(
    `channels: instagram=${view.filter((r) => r.instagram).length} telegram=${view.filter((r) => r.ch.telegram).length} whatsapp=${view.filter((r) => r.ch.whatsapp).length} email=${view.filter((r) => r.email).length}`,
  );
  console.log(`contact_check "проверить": ${flagged}`);
  console.log(`written: ${out}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

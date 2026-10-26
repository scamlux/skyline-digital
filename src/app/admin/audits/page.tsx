import Link from "next/link";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { deleteAudit } from "../estimates/actions";
import { DeleteButton } from "../components/DeleteButton";
import type { Finding } from "@/lib/audit/types";

export const dynamic = "force-dynamic";

const GRADE_COLOR: Record<string, string> = {
  A: "#10b981", B: "#f59e0b", C: "#f97316", D: "#ef4444", F: "#dc2626",
};

/**
 * Hosts we audit ourselves (tests, demos). Excluded from the "real traffic"
 * counters so owner checks are never mistaken for demand.
 */
const OWN_HOSTS = ["skyline-digital.uz", "skylinedigital.xyz", "skyline.uz", "tgpg.uz", "example.com", "localhost"];
const isOwn = (host: string) => OWN_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));

const SOURCES = ["all", "public", "radar"] as const;
type SourceFilter = (typeof SOURCES)[number];

interface Row {
  id: string;
  host: string;
  final_url: string | null;
  reachable: boolean;
  score_total: number | null;
  score_grade: string | null;
  source: string | null;
  email: string | null;
  created_at: string;
  findings: Finding[] | null;
  error_code: string | null;
  share_token?: string | null;
  score_version?: string | null;
}

const BASE_COLS = "id,host,final_url,reachable,score_total,score_grade,source,email,created_at,findings,error_code";

export default async function AuditsPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string }>;
}) {
  if (!isSupabaseConfigured()) return <div className="p-8 text-gray-500">Supabase не настроен.</div>;
  const sp = await searchParams;
  const source: SourceFilter = SOURCES.includes(sp.source as SourceFilter) ? (sp.source as SourceFilter) : "all";
  const db = getSupabaseAdmin();

  const query = (cols: string) => {
    let q = db.from("audits").select(cols, { count: "exact" }).order("created_at", { ascending: false }).limit(100);
    if (source !== "all") q = q.eq("source", source);
    return q;
  };
  // Migration 0015 columns may be missing in an environment — fall back.
  let res = await query(`${BASE_COLS},share_token,score_version`);
  if (res.error) res = await query(BASE_COLS);
  const rows = (res.data ?? []) as unknown as Row[];

  const { external, externalLeads } = await externalTraffic(db);

  return (
    <div className="p-8">
      <h1 className="mb-1 text-2xl font-bold text-gray-900">Аудиты сайтов</h1>
      <p className="mb-6 text-sm text-gray-500">Всего: {res.count ?? 0} · последние 100</p>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Внешних аудитов за 30 дней" value={external.length} hint="без сайтов владельца" />
        <Stat
          label="Из них оставили контакт"
          value={externalLeads}
          hint={external.length ? `${Math.round((100 * externalLeads) / external.length)}% конверсия` : "—"}
        />
        <Stat label="Уникальных внешних сайтов" value={new Set(external.map((r) => r.host)).size} hint="за 30 дней" />
      </div>

      <div className="mb-4 flex gap-2 text-sm">
        {SOURCES.map((s) => (
          <Link
            key={s}
            href={s === "all" ? "/admin/audits" : `/admin/audits?source=${s}`}
            className={`rounded-full border px-4 py-1.5 ${
              source === s ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300 text-gray-600 hover:border-gray-500"
            }`}
          >
            {s === "all" ? "Все" : s === "public" ? "С сайта" : "Радар"}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
              <th className="p-3">Сайт</th>
              <th className="p-3">Оценка</th>
              <th className="p-3">Главная проблема</th>
              <th className="p-3">Источник</th>
              <th className="p-3">Email (лид)</th>
              <th className="p-3">Дата</th>
              <th className="p-3">Отчёт</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} className="border-b border-gray-100 align-top">
                <td className="p-3">
                  {a.final_url ? (
                    <a href={a.final_url} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600">{a.host}</a>
                  ) : (
                    <span className="font-medium text-gray-900">{a.host}</span>
                  )}
                  {isOwn(a.host) && <span className="ml-2 rounded bg-gray-100 px-1.5 text-xs text-gray-500">свой</span>}
                </td>
                <td className="whitespace-nowrap p-3">
                  {a.score_total != null ? (
                    <span className="font-semibold" style={{ color: GRADE_COLOR[a.score_grade ?? ""] ?? "#6b7280" }}>
                      {a.score_grade} · {a.score_total}
                    </span>
                  ) : (
                    <span className="text-red-500">✕ {a.error_code ?? "—"}</span>
                  )}
                  {a.score_version && <span className="ml-1 text-xs text-gray-400">v{a.score_version}</span>}
                </td>
                <td className="p-3 font-mono text-xs text-gray-600">{a.findings?.[0]?.id ?? "—"}</td>
                <td className="p-3 text-gray-600">{a.source ?? "—"}</td>
                <td className="p-3 text-gray-600">{a.email ?? "—"}</td>
                <td className="p-3 text-gray-500">{(a.created_at ?? "").slice(0, 10)}</td>
                <td className="p-3">
                  {a.share_token ? (
                    <a href={`/ru/audit/r/${a.share_token}`} target="_blank" rel="noopener noreferrer" className="text-blue-600">
                      открыть ↗
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="p-3">
                  <DeleteButton onDelete={deleteAudit.bind(null, a.id)} confirmText="Удалить аудит?" />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="p-10 text-center text-gray-400">Аудитов пока нет</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Public audits of the last 30 days, minus our own hosts. */
async function externalTraffic(db: ReturnType<typeof getSupabaseAdmin>) {
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data } = await db.from("audits").select("host,lead_id").eq("source", "public").gte("created_at", since);
  const external = (data ?? []).filter((r) => !isOwn(r.host as string));
  return { external, externalLeads: external.filter((r) => r.lead_id).length };
}

function Stat({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs uppercase text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400">{hint}</p>
    </div>
  );
}

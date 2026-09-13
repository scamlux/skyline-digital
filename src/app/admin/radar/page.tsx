import Link from "next/link";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { getStats } from "@/lib/radar/store";
import { RadarStats } from "./components/RadarStats";
import { FilterBar } from "./components/FilterBar";
import { RunPanel } from "./components/RunPanel";
import { CompaniesTable, type RadarRow } from "./components/CompaniesTable";

export const dynamic = "force-dynamic";
export const metadata = { title: "Radar — база лидов", robots: { index: false, follow: false } };

const PAGE_SIZE = 50;

// Сортировка только по whitelist-колонкам: параметр вида `sort=grade.asc`.
const SORTABLE = new Set(["name", "grade", "city", "industry", "source", "web_status", "verified_at"]);
function parseSort(raw: string | undefined): { col: string; asc: boolean } {
  const [col = "", dir = ""] = (raw ?? "").split(".");
  if (SORTABLE.has(col)) return { col, asc: dir !== "desc" };
  return { col: "verified_at", asc: false };
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Радар — база лидов</h1>
        <Link href="/admin/radar/queries" className="text-sm text-blue-600 hover:underline">
          Параметры сбора →
        </Link>
      </div>
      {children}
    </div>
  );
}

export default async function RadarAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  if (!isSupabaseConfigured()) {
    return (
      <Shell>
        <p className="text-gray-500">Supabase не настроен (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).</p>
      </Shell>
    );
  }

  const db = getSupabaseAdmin();
  const page = Math.max(0, Number(sp.page ?? 0) || 0);

  let query = db
    .from("radar_companies")
    .select(
      "id,name,phone,website,city,industry,source,grade,web_status,email,social_links,verified_at",
      { count: "exact" },
    )
    .eq("discarded", false);

  if (sp.industry) query = query.eq("industry", sp.industry);
  if (sp.grade) query = query.eq("grade", sp.grade);
  if (sp.source) query = query.eq("source", sp.source);
  if (sp.site === "yes") query = query.not("website", "is", null);
  if (sp.site === "no") query = query.is("website", null);
  if (sp.city) query = query.ilike("city", `%${sp.city}%`);
  if (sp.q) {
    // Sanitise: PostgREST `or` uses commas/parens as syntax.
    const safe = sp.q.replace(/[,()*%]/g, " ").trim();
    if (safe) query = query.or(`name.ilike.%${safe}%,phone.ilike.%${safe}%`);
  }

  const sort = parseSort(sp.sort);
  const { data, count } = await query
    .order(sort.col, { ascending: sort.asc, nullsFirst: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

  const stats = await getStats(db);
  const { data: queryRows } = await db
    .from("radar_queries")
    .select("key,label")
    .eq("active", true)
    .order("created_at", { ascending: true });
  const industries = (queryRows ?? []) as { key: string; label: string }[];

  return (
    <Shell>
      <RadarStats stats={stats} />
      <div className="mt-4">
        <RunPanel industries={(queryRows ?? []) as { key: string; label: string }[]} />
      </div>
      <div className="mt-6">
        <FilterBar industries={industries} />
      </div>
      <div className="mt-4">
        <CompaniesTable rows={(data ?? []) as RadarRow[]} page={page} total={count ?? 0} industries={industries} />
      </div>
    </Shell>
  );
}

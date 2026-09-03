import Link from "next/link";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { LeadsTable, type LeadRowUi } from "./LeadsTable";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 50;

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  if (!isSupabaseConfigured()) {
    return <div className="p-8 text-gray-500">Supabase не настроен.</div>;
  }
  const db = getSupabaseAdmin();
  const page = Math.max(0, Number(sp.page ?? 0) || 0);

  let q = db
    .from("leads")
    .select(
      "id,lead_number,client_name,company,email,phone,telegram,project_type,source,status,calculated_price,currency,ai_summary,description,created_at",
      { count: "exact" },
    );
  if (sp.status) q = q.eq("status", sp.status);
  if (sp.q) {
    const safe = sp.q.replace(/[,()*%]/g, " ").trim();
    if (safe) q = q.or(`client_name.ilike.%${safe}%,email.ilike.%${safe}%,phone.ilike.%${safe}%`);
  }
  const { data, count } = await q
    .order("created_at", { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

  const rows = (data ?? []) as LeadRowUi[];
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const mkHref = (p: number) => {
    const u = new URLSearchParams(sp as Record<string, string>);
    u.set("page", String(p));
    return `/admin/leads?${u.toString()}`;
  };

  return (
    <div className="p-8">
      <h1 className="mb-1 text-2xl font-bold text-gray-900">Заявки</h1>
      <p className="mb-6 text-sm text-gray-500">Всего: {count ?? 0} · клик по строке — карточка с редактированием</p>

      <form className="mb-4 flex flex-wrap gap-2" action="/admin/leads">
        <select name="status" defaultValue={sp.status ?? ""} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
          <option value="">Все статусы</option>
          {["NEW", "IN_PROGRESS", "PROPOSAL_SENT", "NEGOTIATION", "WON", "LOST"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input name="q" defaultValue={sp.q ?? ""} placeholder="Имя / email / телефон" className="min-w-[220px] flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm" />
        <button className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white">Фильтр</button>
      </form>

      <LeadsTable rows={rows} />

      <div className="mt-3 flex items-center justify-end gap-2 text-sm text-gray-600">
        {page > 0 && <Link href={mkHref(page - 1)} className="rounded border border-gray-300 px-3 py-1">← Назад</Link>}
        <span>{page + 1} / {pages}</span>
        {page + 1 < pages && <Link href={mkHref(page + 1)} className="rounded border border-gray-300 px-3 py-1">Вперёд →</Link>}
      </div>
    </div>
  );
}

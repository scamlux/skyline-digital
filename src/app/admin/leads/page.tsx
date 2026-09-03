import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 50;

const STATUS_STYLE: Record<string, string> = {
  NEW: "bg-blue-50 text-blue-700",
  IN_PROGRESS: "bg-amber-50 text-amber-700",
  PROPOSAL_SENT: "bg-violet-50 text-violet-700",
  NEGOTIATION: "bg-cyan-50 text-cyan-700",
  WON: "bg-emerald-50 text-emerald-700",
  LOST: "bg-gray-100 text-gray-500",
};

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
      "id,lead_number,client_name,company,email,phone,telegram,project_type,source,status,calculated_price,currency,ai_summary,created_at",
      { count: "exact" },
    );
  if (sp.status) q = q.eq("status", sp.status);
  if (sp.source) q = q.eq("source", sp.source);
  if (sp.q) {
    const safe = sp.q.replace(/[,()*%]/g, " ").trim();
    if (safe) q = q.or(`client_name.ilike.%${safe}%,email.ilike.%${safe}%,phone.ilike.%${safe}%`);
  }
  const { data, count } = await q
    .order("created_at", { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

  const rows = data ?? [];
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const mkHref = (patch: Record<string, string>) => {
    const p = new URLSearchParams(sp as Record<string, string>);
    for (const [k, v] of Object.entries(patch)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    return `/admin/leads?${p.toString()}`;
  };

  return (
    <div className="p-8">
      <h1 className="mb-1 text-2xl font-bold text-gray-900">Заявки</h1>
      <p className="mb-6 text-sm text-gray-500">Всего: {count ?? 0}</p>

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

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
              <th className="p-3">№</th>
              <th className="p-3">Клиент</th>
              <th className="p-3">Контакт</th>
              <th className="p-3">Тип</th>
              <th className="p-3">Источник</th>
              <th className="p-3">Цена</th>
              <th className="p-3">Статус</th>
              <th className="p-3">Дата</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id} className="border-b border-gray-100 align-top">
                <td className="p-3 font-mono text-xs text-gray-500">{l.lead_number}</td>
                <td className="p-3">
                  <div className="font-medium text-gray-900">{l.client_name ?? "—"}</div>
                  {l.company && <div className="text-xs text-gray-500">{l.company}</div>}
                  {l.ai_summary && <div className="mt-1 max-w-xs text-xs text-gray-400">{l.ai_summary}</div>}
                </td>
                <td className="p-3 text-gray-600">
                  {l.email && <div><a className="text-blue-600" href={`mailto:${l.email}`}>{l.email}</a></div>}
                  {l.phone && <div><a className="text-blue-600" href={`tel:${l.phone}`}>{l.phone}</a></div>}
                  {l.telegram && <div className="text-gray-500">{l.telegram}</div>}
                </td>
                <td className="p-3 text-gray-600">{l.project_type ?? "—"}</td>
                <td className="p-3 text-gray-600">{l.source ?? "—"}</td>
                <td className="p-3 text-gray-600">{l.calculated_price ? `${l.calculated_price} ${l.currency ?? ""}` : "—"}</td>
                <td className="p-3">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[l.status] ?? "bg-gray-100 text-gray-500"}`}>{l.status}</span>
                </td>
                <td className="p-3 text-gray-500">{(l.created_at ?? "").slice(0, 10)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={8} className="p-10 text-center text-gray-400">Заявок нет</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2 text-sm text-gray-600">
        {page > 0 && <a href={mkHref({ page: String(page - 1) })} className="rounded border border-gray-300 px-3 py-1">← Назад</a>}
        <span>{page + 1} / {pages}</span>
        {page + 1 < pages && <a href={mkHref({ page: String(page + 1) })} className="rounded border border-gray-300 px-3 py-1">Вперёд →</a>}
      </div>
    </div>
  );
}

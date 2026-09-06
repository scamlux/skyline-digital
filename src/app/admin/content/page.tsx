import Link from "next/link";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { toTashkentDisplay } from "@/lib/content/tz";
import { statusBadge } from "./Editor";

export const dynamic = "force-dynamic";

export default async function ContentListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  if (!isSupabaseConfigured()) return <div className="p-8 text-gray-500">Supabase не настроен.</div>;
  const db = getSupabaseAdmin();
  let q = db
    .from("content_posts")
    .select("id,slug,title,style,format,status,platforms,scheduled_at,updated_at", { count: "exact" });
  if (sp.status) q = q.eq("status", sp.status);
  if (sp.style) q = q.eq("style", sp.style);
  if (sp.q) q = q.ilike("title", `%${sp.q.replace(/[%,()]/g, " ")}%`);
  const { data, count } = await q.order("updated_at", { ascending: false }).limit(100);
  const rows = data ?? [];

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Контент</h1>
          <p className="mt-1 text-sm text-gray-500">Студия постов · всего: {count ?? 0}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/content/calendar" className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm">Календарь</Link>
          <Link href="/admin/content/new" className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white">+ Новый пост</Link>
        </div>
      </div>

      <form className="mb-4 flex flex-wrap gap-2" action="/admin/content">
        <select name="status" defaultValue={sp.status ?? ""} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
          <option value="">Все статусы</option>
          {["draft", "planned", "review", "approved", "scheduled", "published", "failed", "blocked"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select name="style" defaultValue={sp.style ?? ""} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
          <option value="">Все шкуры</option>
          <option value="studio">studio</option>
          <option value="vibe">vibe</option>
        </select>
        <input name="q" defaultValue={sp.q ?? ""} placeholder="Поиск по названию" className="min-w-[220px] flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm" />
        <button className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white">Фильтр</button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
              <th className="p-3">Пост</th>
              <th className="p-3">Шкура</th>
              <th className="p-3">Формат</th>
              <th className="p-3">Площадки</th>
              <th className="p-3">Статус</th>
              <th className="p-3">Дата</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="p-3">
                  <Link href={`/admin/content/${p.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                    {p.title}
                  </Link>
                  <div className="font-mono text-xs text-gray-400">{p.slug}</div>
                </td>
                <td className="p-3 text-gray-600">{p.style}</td>
                <td className="p-3 text-gray-600">{p.format}</td>
                <td className="p-3 text-gray-600">{(p.platforms ?? []).join(", ") || "—"}</td>
                <td className="p-3">{statusBadge(p.status)}</td>
                <td className="p-3 text-gray-500">
                  {p.scheduled_at ? `📅 ${toTashkentDisplay(p.scheduled_at)}` : p.updated_at.slice(0, 10)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="p-10 text-center text-gray-400">Постов нет — создайте первый или примените миграцию 0009</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

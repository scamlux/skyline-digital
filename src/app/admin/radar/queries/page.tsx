import Link from "next/link";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { addQuery } from "./actions";
import { QueryRowActions } from "./QueryRowActions";

export const dynamic = "force-dynamic";

const INPUT = "rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm";

export default async function RadarQueriesPage() {
  if (!isSupabaseConfigured()) return <div className="p-8 text-gray-500">Supabase не настроен.</div>;
  const db = getSupabaseAdmin();
  const { data } = await db
    .from("radar_queries")
    .select("id,key,label,keywords,cities,active,created_at")
    .order("created_at", { ascending: true });
  const rows = data ?? [];

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Параметры радара</h1>
          <p className="mt-1 text-sm text-gray-500">
            Отрасли и поисковые фразы для сбора. CLI подхватывает их автоматически:
            <code className="ml-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs">npm run radar -- --all</code>
          </p>
        </div>
        <Link href="/admin/radar" className="text-sm text-blue-600 hover:underline">← К базе лидов</Link>
      </div>

      <form action={addQuery} className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Новая отрасль</h2>
        <div className="flex flex-wrap gap-2">
          <input name="label" required placeholder="Название (напр. «Фитнес-клубы»)" className={`${INPUT} min-w-[220px]`} />
          <input name="key" placeholder="Ключ (латиницей, напр. fitness)" className={`${INPUT} min-w-[180px]`} />
          <input
            name="keywords"
            required
            placeholder="Фразы через запятую: fitness club, тренажёрный зал"
            className={`${INPUT} min-w-[320px] flex-1`}
          />
          <input name="cities" placeholder="Города через запятую (пусто = все основные)" className={`${INPUT} min-w-[260px]`} />
          <button className="rounded-lg bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-700">
            Добавить
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Совет: 2–3 фразы на разных языках (en + ru) дают лучший охват в Google Maps.
        </p>
      </form>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
              <th className="p-3">Отрасль</th>
              <th className="p-3">Ключ</th>
              <th className="p-3">Поисковые фразы</th>
              <th className="p-3">Города</th>
              <th className="p-3">Статус</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((q) => (
              <tr key={q.id} className={`border-b border-gray-100 ${q.active ? "" : "opacity-50"}`}>
                <td className="p-3 font-medium text-gray-900">{q.label}</td>
                <td className="p-3 font-mono text-xs text-gray-500">{q.key}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {((q.keywords as string[]) ?? []).map((k) => (
                      <span key={k} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{k}</span>
                    ))}
                  </div>
                </td>
                <td className="p-3 text-gray-600">
                  {Array.isArray(q.cities) && q.cities.length ? (q.cities as string[]).join(", ") : "основные"}
                </td>
                <td className="p-3">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${q.active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                    {q.active ? "активна" : "выкл"}
                  </span>
                </td>
                <td className="p-3">
                  <QueryRowActions id={q.id} active={q.active} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="p-10 text-center text-gray-400">Отраслей нет — примените миграцию 0007 или добавьте первую выше</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { deleteEstimate } from "./actions";
import { DeleteButton } from "../components/DeleteButton";

export const dynamic = "force-dynamic";

export default async function EstimatesPage() {
  if (!isSupabaseConfigured()) return <div className="p-8 text-gray-500">Supabase не настроен.</div>;
  const db = getSupabaseAdmin();
  const { data, count } = await db
    .from("estimates")
    .select("id,token,project_type,pricing_result,created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(100);
  const rows = data ?? [];

  return (
    <div className="p-8">
      <h1 className="mb-1 text-2xl font-bold text-gray-900">Сметы и КП</h1>
      <p className="mb-6 text-sm text-gray-500">Всего смет: {count ?? 0} · последние 100</p>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
              <th className="p-3">Тип проекта</th>
              <th className="p-3">Итог</th>
              <th className="p-3">Дата</th>
              <th className="p-3">Смета</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => {
              const pr = e.pricing_result as { total?: number; totalMin?: number; totalMax?: number } | null;
              const total = pr?.total ?? pr?.totalMax ?? null;
              return (
                <tr key={e.id} className="border-b border-gray-100">
                  <td className="p-3 font-medium text-gray-900">{e.project_type}</td>
                  <td className="p-3 text-gray-700">{total != null ? `$${total}` : "—"}</td>
                  <td className="p-3 text-gray-500">{(e.created_at ?? "").slice(0, 10)}</td>
                  <td className="p-3">
                    <a href={`/estimate/${e.token}`} target="_blank" rel="noopener noreferrer" className="text-blue-600">Открыть ↗</a>
                  </td>
                  <td className="p-3"><DeleteButton onDelete={deleteEstimate.bind(null, e.id)} confirmText="Удалить смету безвозвратно?" /></td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="p-10 text-center text-gray-400">Смет пока нет</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

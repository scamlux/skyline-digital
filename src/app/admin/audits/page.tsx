import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { deleteAudit } from "../estimates/actions";
import { DeleteButton } from "../components/DeleteButton";

export const dynamic = "force-dynamic";

const GRADE_COLOR: Record<string, string> = {
  A: "#10b981", B: "#f59e0b", C: "#f97316", D: "#ef4444", F: "#dc2626",
};

export default async function AuditsPage() {
  if (!isSupabaseConfigured()) return <div className="p-8 text-gray-500">Supabase не настроен.</div>;
  const db = getSupabaseAdmin();
  const { data, count } = await db
    .from("audits")
    .select("id,host,final_url,reachable,score_total,score_grade,source,email,created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(100);
  const rows = data ?? [];

  return (
    <div className="p-8">
      <h1 className="mb-1 text-2xl font-bold text-gray-900">Аудиты сайтов</h1>
      <p className="mb-6 text-sm text-gray-500">Всего: {count ?? 0} · последние 100</p>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
              <th className="p-3">Сайт</th>
              <th className="p-3">Оценка</th>
              <th className="p-3">Достижим</th>
              <th className="p-3">Источник</th>
              <th className="p-3">Email (лид)</th>
              <th className="p-3">Дата</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} className="border-b border-gray-100">
                <td className="p-3">
                  {a.final_url ? (
                    <a href={a.final_url} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600">{a.host}</a>
                  ) : (
                    <span className="font-medium text-gray-900">{a.host}</span>
                  )}
                </td>
                <td className="p-3">
                  {a.score_total != null ? (
                    <span className="font-semibold" style={{ color: GRADE_COLOR[a.score_grade ?? ""] ?? "#6b7280" }}>
                      {a.score_grade} · {a.score_total}
                    </span>
                  ) : "—"}
                </td>
                <td className="p-3">{a.reachable ? "✓" : <span className="text-red-500">✕</span>}</td>
                <td className="p-3 text-gray-600">{a.source ?? "—"}</td>
                <td className="p-3 text-gray-600">{a.email ?? "—"}</td>
                <td className="p-3 text-gray-500">{(a.created_at ?? "").slice(0, 10)}</td>
                <td className="p-3"><DeleteButton onDelete={deleteAudit.bind(null, a.id)} confirmText="Удалить аудит?" /></td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="p-10 text-center text-gray-400">Аудитов пока нет</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

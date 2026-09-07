import Link from "next/link";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { toTashkentDisplay } from "@/lib/content/tz";
import { buildRubricReports, type MetricRow } from "@/lib/content/metrics-report";

export const dynamic = "force-dynamic";

interface MetricRecord {
  collect_window: string;
  views: number | null;
  saves: number | null;
  shares: number | null;
  comments: number | null;
}
interface PubRow {
  content_posts: { id: string; slug: string; title: string; rubric: string | null; scheduled_at: string | null };
  content_metrics: MetricRecord[];
}

const NUM = "px-3 py-2 text-right tabular-nums";

export default async function MetricsPage() {
  if (!isSupabaseConfigured()) {
    return <div className="p-8 text-gray-500">Supabase не настроен.</div>;
  }
  const db = getSupabaseAdmin();
  const { data } = await db
    .from("content_publications")
    .select(
      "id, content_posts!inner(id,slug,title,rubric,scheduled_at), content_metrics(collect_window,views,saves,shares,comments)",
    )
    .eq("platform", "instagram");

  const rows: MetricRow[] = ((data ?? []) as unknown as PubRow[]).map((p) => {
    const best =
      p.content_metrics?.find((m) => m.collect_window === "7d") ??
      p.content_metrics?.find((m) => m.collect_window === "24h") ??
      null;
    const post = p.content_posts;
    return {
      postId: post.id,
      slug: post.slug,
      title: post.title,
      rubric: post.rubric,
      scheduledAt: post.scheduled_at,
      views: best?.views ?? null,
      saves: best?.saves ?? null,
      shares: best?.shares ?? null,
      comments: best?.comments ?? null,
    };
  });

  const reports = buildRubricReports(rows);

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Метрики · медиана по рубрике</h1>
        <Link href="/admin/content" className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm">
          ← К постам
        </Link>
      </div>

      {rows.length === 0 && (
        <p className="text-gray-500">
          Метрик пока нет. Они собираются кроном через 24 часа и 7 дней после публикации в Instagram.
        </p>
      )}

      <div className="space-y-8">
        {reports.map((rep) => (
          <div key={rep.rubric}>
            <div className="mb-2 flex items-baseline gap-3">
              <h2 className="text-lg font-semibold text-gray-900">{rep.rubric}</h2>
              <span className="text-sm text-gray-500">медиана охвата: {rep.medianViews}</span>
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Дата</th>
                    <th className="px-3 py-2 text-left">Пост</th>
                    <th className="px-3 py-2 text-right">Охват</th>
                    <th className="px-3 py-2 text-right">Сохранения</th>
                    <th className="px-3 py-2 text-right">Пересылки</th>
                    <th className="px-3 py-2 text-right">Комментарии</th>
                  </tr>
                </thead>
                <tbody>
                  {rep.posts.map((p) => (
                    <tr
                      key={p.postId}
                      className={`border-t border-gray-100 ${p.flaggedRed ? "bg-red-50 text-red-700" : ""}`}
                    >
                      <td className="px-3 py-2 text-left text-gray-500">
                        {toTashkentDisplay(p.scheduledAt) || "—"}
                      </td>
                      <td className="px-3 py-2 text-left">
                        <Link href={`/admin/content/${p.postId}`} className="hover:underline">
                          {p.title}
                        </Link>
                        {p.flaggedRed && <span className="ml-2 text-xs">↓ серия ниже медианы</span>}
                      </td>
                      <td className={NUM}>{p.views ?? "—"}</td>
                      <td className={NUM}>{p.saves ?? "—"}</td>
                      <td className={NUM}>{p.shares ?? "—"}</td>
                      <td className={NUM}>{p.comments ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

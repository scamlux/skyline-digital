import Link from "next/link";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Календарь месяца: посты по scheduled_at (+published по дате публикации). */
export default async function ContentCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const sp = await searchParams;
  if (!isSupabaseConfigured()) return <div className="p-8 text-gray-500">Supabase не настроен.</div>;
  const now = new Date();
  const [y, m] = (sp.m ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`)
    .split("-")
    .map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const next = new Date(Date.UTC(y, m, 1));
  const prevM = `${m === 1 ? y - 1 : y}-${String(m === 1 ? 12 : m - 1).padStart(2, "0")}`;
  const nextM = `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}`;

  const db = getSupabaseAdmin();
  const { data } = await db
    .from("content_posts")
    .select("id,title,status,scheduled_at")
    .gte("scheduled_at", first.toISOString())
    .lt("scheduled_at", next.toISOString());
  const byDay = new Map<number, { id: string; title: string; status: string }[]>();
  for (const p of data ?? []) {
    const d = new Date(p.scheduled_at as string).getUTCDate();
    byDay.set(d, [...(byDay.get(d) ?? []), p]);
  }

  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const startDow = (first.getUTCDay() + 6) % 7; // Пн=0
  const cells: (number | null)[] = [
    ...Array.from({ length: startDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Календарь · {String(m).padStart(2, "0")}.{y}</h1>
        <div className="flex gap-2 text-sm">
          <Link href={`/admin/content/calendar?m=${prevM}`} className="rounded border border-gray-300 px-3 py-1">←</Link>
          <Link href={`/admin/content/calendar?m=${nextM}`} className="rounded border border-gray-300 px-3 py-1">→</Link>
          <Link href="/admin/content" className="rounded border border-gray-300 px-3 py-1">К списку</Link>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((d) => (
          <div key={d} className="px-2 text-xs font-semibold uppercase text-gray-400">{d}</div>
        ))}
        {cells.map((day, i) => (
          <div key={i} className={`min-h-24 rounded-lg border p-2 ${day ? "border-gray-200 bg-white" : "border-transparent"}`}>
            {day && <div className="mb-1 text-xs font-semibold text-gray-400">{day}</div>}
            {day &&
              (byDay.get(day) ?? []).map((p) => (
                <Link key={p.id} href={`/admin/content/${p.id}`}
                  className={`mb-1 block truncate rounded px-1.5 py-0.5 text-xs ${
                    p.status === "published" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"
                  }`}>
                  {p.title}
                </Link>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}

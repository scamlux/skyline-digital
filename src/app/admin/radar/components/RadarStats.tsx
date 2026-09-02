import type { RadarStats as Stats } from "@/lib/radar/store";

export function RadarStats({ stats }: { stats: Stats }) {
  const cards = [
    { label: "Всего", value: stats.total, color: "#111827" },
    { label: "A — горячие", value: stats.byGrade.A, color: "#10b981" },
    { label: "B — тёплые", value: stats.byGrade.B, color: "#f59e0b" },
    { label: "C — холодные", value: stats.byGrade.C, color: "#6b7480" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">{c.label}</div>
          <div className="mt-1 text-3xl font-bold" style={{ color: c.color }}>
            {c.value}
          </div>
        </div>
      ))}
      {Object.keys(stats.byIndustry).length > 0 && (
        <div className="col-span-2 flex flex-wrap items-center gap-2 text-sm text-gray-600 sm:col-span-4">
          <span className="text-gray-400">По отраслям:</span>
          {Object.entries(stats.byIndustry).map(([k, v]) => (
            <span key={k} className="rounded-full border border-gray-200 bg-white px-3 py-1">
              {k}: <b>{v}</b>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

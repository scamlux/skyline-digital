import { contentDiagnostics } from "@/lib/content/diagnostics";

/** Блок «Диагностика» вверху /admin/content (ПРОМПТ-3 §1.2). */
export function Diagnostics() {
  const diags = contentDiagnostics();
  const chip = (ok: boolean, manual: boolean) =>
    manual
      ? "bg-gray-100 text-gray-500 border-gray-200"
      : ok
        ? "bg-green-50 text-green-700 border-green-200"
        : "bg-red-50 text-red-700 border-red-200";

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-900">Диагностика площадок</span>
        <span className="text-xs text-gray-400">переменные окружения задаются на Vercel</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {diags.map((d) => (
          <div key={d.key} className={`rounded-lg border px-3 py-2 text-sm ${chip(d.ok, d.kind === "manual")}`}>
            <div className="flex items-center justify-between">
              <span className="font-medium">{d.label}</span>
              <span className="text-xs uppercase">
                {d.kind === "manual" ? "вручную" : d.ok ? "настроена" : "не настроена"}
              </span>
            </div>
            <div className="mt-0.5 text-xs opacity-80">{d.detail}</div>
            {d.missing.length > 0 && (
              <div className="mt-1 font-mono text-[11px] opacity-90">не хватает: {d.missing.join(", ")}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

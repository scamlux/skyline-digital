"use client";

import { useState } from "react";
import { importPlanAction } from "./actions";
import type { ImportReport } from "@/lib/content/import-plan";

/** Кнопка «Импорт плана» + отчёт (ПРОМПТ-3 §1.3). */
export function ImportPlanButton() {
  const [pending, setPending] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);

  async function run() {
    setPending(true);
    try {
      setReport(await importPlanAction());
    } catch (e) {
      setReport({ created: 0, updated: 0, skipped: 0, errors: 1, rows: [{ slug: "-", action: "error", error: String(e) }] });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        onClick={run}
        disabled={pending}
        className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Импортирую…" : "Импорт плана"}
      </button>
      {report && (
        <div className="w-full rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
          <div className="font-medium text-gray-900">
            Создано {report.created} · обновлено {report.updated} · пропущено {report.skipped} ·{" "}
            <span className={report.errors ? "text-red-600" : "text-gray-500"}>ошибок {report.errors}</span>
          </div>
          {report.rows.filter((r) => r.action === "error" || r.action === "skipped").length > 0 && (
            <ul className="mt-1 space-y-0.5 text-xs text-gray-600">
              {report.rows
                .filter((r) => r.action === "error" || r.action === "skipped")
                .map((r) => (
                  <li key={r.slug}>
                    <span className="font-mono">{r.slug}</span> — {r.action}
                    {r.error ? `: ${r.error}` : r.status ? ` (${r.status})` : ""}
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

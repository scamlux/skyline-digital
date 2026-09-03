"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Loader2 } from "lucide-react";

interface RunResult {
  industry: string;
  found: number;
  unique: number;
  grades: { A: number; B: number; C: number };
  new: number;
  updated: number;
  errors: string[];
  error?: string;
}

/** One-click radar scan straight from the admin (Google + Geoapify APIs). */
export function RunPanel({ industries }: { industries: { key: string; label: string }[] }) {
  const router = useRouter();
  const [industry, setIndustry] = useState(industries[0]?.key ?? "");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);

  const run = async () => {
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch("/admin/radar/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ industry }),
      });
      const json = (await res.json()) as RunResult;
      setResult(json);
      router.refresh();
    } catch (e) {
      setResult({ industry, found: 0, unique: 0, grades: { A: 0, B: 0, C: 0 }, new: 0, updated: 0, errors: [String(e)] });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold text-gray-700">Запустить сбор:</span>
        <select
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          disabled={running}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
        >
          {industries.map((i) => (
            <option key={i.key} value={i.key}>{i.label}</option>
          ))}
        </select>
        <button
          onClick={run}
          disabled={running || !industry}
          className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {running ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
          {running ? "Сканирую… (1–3 мин)" : "Запустить"}
        </button>
        <span className="text-xs text-gray-400">Google + Geoapify · одна отрасль за запуск · дубли схлопываются</span>
      </div>
      {result && (
        <div className="mt-3 rounded-lg bg-gray-50 px-4 py-3 text-sm">
          {result.error ? (
            <span className="text-red-600">Ошибка: {result.error}</span>
          ) : (
            <>
              <b>{result.industry}</b>: найдено {result.found} → {result.unique} уникальных ·{" "}
              <span className="font-medium text-emerald-600">A={result.grades.A}</span>{" "}
              <span className="font-medium text-amber-600">B={result.grades.B}</span>{" "}
              <span className="text-gray-500">C={result.grades.C}</span> · записано{" "}
              <b>{result.new} новых</b> / {result.updated} обновлено
              {result.errors.length > 0 && (
                <span className="ml-2 text-red-500">({result.errors.length} ошибок)</span>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

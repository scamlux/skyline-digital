"use client";

import { useState, useTransition } from "react";
import { setFxRate } from "../projects/actions";

export function FxEditor({ initial }: { initial: number }) {
  const [v, setV] = useState(String(initial));
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  return (
    <div>
      <label className="text-xs uppercase tracking-wide text-gray-500">Курс, сум за $1 (для КП)</label>
      <div className="mt-1 flex items-center gap-2">
        <input
          type="number"
          value={v}
          onChange={(e) => { setV(e.target.value); setSaved(false); }}
          className="w-36 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          disabled={pending || !Number(v)}
          onClick={() => start(async () => { await setFxRate(Number(v)); setSaved(true); })}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "…" : saved ? "Сохранено ✓" : "Сохранить"}
        </button>
      </div>
    </div>
  );
}

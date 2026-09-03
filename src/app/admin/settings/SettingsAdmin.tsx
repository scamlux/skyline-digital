"use client";

import { useState, useTransition } from "react";
import { saveSetting, deleteSetting } from "../projects/actions";

export interface SettingRow {
  key: string;
  value: unknown;
  updated_at: string;
}

const INPUT = "rounded-lg border border-gray-300 px-3 py-2 text-sm";

export function SettingsAdmin({ rows }: { rows: SettingRow[] }) {
  const [pending, start] = useTransition();
  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState("");

  return (
    <>
      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Новая настройка</div>
        <div className="flex flex-wrap gap-2">
          <input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="ключ (напр. telegram_chat)" className={`${INPUT} w-56`} />
          <input value={newVal} onChange={(e) => setNewVal(e.target.value)} placeholder='значение (число, строка или JSON)' className={`${INPUT} min-w-[280px] flex-1`} />
          <button
            disabled={pending || !newKey.trim()}
            onClick={() => start(async () => { await saveSetting(newKey.trim(), newVal); setNewKey(""); setNewVal(""); })}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Добавить
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
              <th className="p-3">Ключ</th>
              <th className="p-3">Значение (JSON)</th>
              <th className="p-3">Обновлено</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => <Row key={r.key} row={r} />)}
            {rows.length === 0 && (
              <tr><td colSpan={4} className="p-10 text-center text-gray-400">Настроек нет</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Row({ row }: { row: SettingRow }) {
  const [pending, start] = useTransition();
  const [v, setV] = useState(JSON.stringify(row.value));
  const dirty = v !== JSON.stringify(row.value);
  return (
    <tr className="border-b border-gray-100">
      <td className="p-3 font-mono text-xs font-medium text-gray-900">{row.key}</td>
      <td className="p-3">
        <input value={v} onChange={(e) => setV(e.target.value)} className={`${INPUT} w-full font-mono text-xs`} />
      </td>
      <td className="p-3 text-xs text-gray-500">{row.updated_at.slice(0, 16).replace("T", " ")}</td>
      <td className="flex gap-1 p-3">
        <button
          disabled={pending || !dirty}
          onClick={() => start(async () => { await saveSetting(row.key, v); })}
          className="rounded bg-gray-900 px-3 py-1 text-xs font-medium text-white disabled:opacity-40"
        >
          {pending ? "…" : "Сохранить"}
        </button>
        <button
          disabled={pending}
          onClick={() => { if (confirm(`Удалить настройку «${row.key}»?`)) start(async () => { await deleteSetting(row.key); }); }}
          className="rounded px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50"
        >
          Удалить
        </button>
      </td>
    </tr>
  );
}

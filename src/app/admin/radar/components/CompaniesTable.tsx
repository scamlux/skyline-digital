"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CellGrade } from "./CellGrade";
import { markDiscarded, recheckWebsite } from "../actions";

export interface RadarRow {
  id: string;
  name: string;
  phone: string | null;
  website: string | null;
  city: string | null;
  industry: string;
  source: string | null;
  grade: string | null;
  web_status: string | null;
  email: string | null;
  social_links: string[] | null;
  verified_at: string | null;
}

export function CompaniesTable({ rows, page, total }: { rows: RadarRow[]; page: number; total: number }) {
  const [sel, setSel] = useState<RadarRow | null>(null);
  const sp = useSearchParams();
  const pages = Math.max(1, Math.ceil(total / 50));
  const pageHref = (p: number) => {
    const q = new URLSearchParams(sp.toString());
    q.set("page", String(p));
    return `/admin/radar?${q.toString()}`;
  };

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
              <th className="p-3">Название</th>
              <th className="p-3">Телефон</th>
              <th className="p-3">Оценка</th>
              <th className="p-3">Отрасль</th>
              <th className="p-3">Город</th>
              <th className="p-3">Источник</th>
              <th className="p-3">Сайт</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} onClick={() => setSel(r)} className="cursor-pointer border-b border-gray-100 hover:bg-gray-50">
                <td className="p-3 font-medium text-gray-900">{r.name}</td>
                <td className="p-3">
                  {r.phone ? (
                    <a href={`tel:${r.phone}`} onClick={(e) => e.stopPropagation()} className="text-blue-600">{r.phone}</a>
                  ) : "—"}
                </td>
                <td className="p-3"><CellGrade grade={r.grade} /></td>
                <td className="p-3 text-gray-600">{r.industry}</td>
                <td className="p-3 text-gray-600">{r.city ?? "—"}</td>
                <td className="p-3 text-gray-600">{r.source ?? "—"}</td>
                <td className="p-3">
                  {r.website ? (
                    <a href={r.website} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-blue-600">↗</a>
                  ) : "—"}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="p-10 text-center text-gray-400">
                  Нет данных. Запустите сбор: <code>npm run radar -- --all</code>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
        <span>Всего: {total}</span>
        <div className="flex items-center gap-2">
          {page > 0 && <Link href={pageHref(page - 1)} className="rounded border border-gray-300 px-3 py-1">← Назад</Link>}
          <span className="px-2">{page + 1} / {pages}</span>
          {page + 1 < pages && <Link href={pageHref(page + 1)} className="rounded border border-gray-300 px-3 py-1">Вперёд →</Link>}
        </div>
      </div>

      {sel && <Drawer row={sel} onClose={() => setSel(null)} />}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between gap-4 border-b border-gray-100 py-1">
      <dt className="text-gray-500">{label}</dt>
      <dd className="break-all text-right font-medium text-gray-900">{value || "—"}</dd>
    </div>
  );
}

function Drawer({ row, onClose }: { row: RadarRow; onClose: () => void }) {
  const [pending, start] = useTransition();
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-bold text-gray-900">{row.name}</h2>
          <button onClick={onClose} className="text-2xl leading-none text-gray-400 hover:text-gray-700">×</button>
        </div>
        <div className="mt-2"><CellGrade grade={row.grade} /></div>
        <dl className="mt-4 space-y-1 text-sm">
          <Field label="Телефон" value={row.phone} />
          <Field label="Сайт" value={row.website} />
          <Field label="Email" value={row.email} />
          <Field label="Город" value={row.city} />
          <Field label="Отрасль" value={row.industry} />
          <Field label="Источник" value={row.source} />
          <Field label="Web-статус" value={row.web_status} />
          <Field label="Соцсети" value={(row.social_links ?? []).join(", ") || null} />
          <Field label="Проверено" value={row.verified_at} />
        </dl>
        <div className="mt-6 space-y-3">
          <button
            disabled={pending}
            onClick={() => start(async () => { await recheckWebsite(row.id); onClose(); })}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50"
          >
            {pending ? "…" : "Перепроверить сайт"}
          </button>
          <div className="rounded-lg border border-gray-200 p-3">
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Причина отбраковки (необязательно)"
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            />
            <button
              disabled={pending}
              onClick={() => start(async () => { await markDiscarded(row.id, reason); onClose(); })}
              className="mt-2 w-full rounded-lg bg-red-50 px-4 py-2 font-medium text-red-600 disabled:opacity-50"
            >
              Отбраковать (скрыть)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

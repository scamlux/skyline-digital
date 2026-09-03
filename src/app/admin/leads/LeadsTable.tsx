"use client";

import { useState, useTransition } from "react";
import { updateLeadStatus, updateLeadFields, deleteLead } from "./actions";

export interface LeadRowUi {
  id: string;
  lead_number: string;
  client_name: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  telegram: string | null;
  project_type: string | null;
  source: string | null;
  status: string;
  calculated_price: number | null;
  currency: string | null;
  ai_summary: string | null;
  description: string | null;
  created_at: string;
}

const STATUSES = ["NEW", "IN_PROGRESS", "PROPOSAL_SENT", "NEGOTIATION", "WON", "LOST"];
const STATUS_STYLE: Record<string, string> = {
  NEW: "bg-blue-50 text-blue-700",
  IN_PROGRESS: "bg-amber-50 text-amber-700",
  PROPOSAL_SENT: "bg-violet-50 text-violet-700",
  NEGOTIATION: "bg-cyan-50 text-cyan-700",
  WON: "bg-emerald-50 text-emerald-700",
  LOST: "bg-gray-100 text-gray-500",
};
const STATUS_RU: Record<string, string> = {
  NEW: "Новая",
  IN_PROGRESS: "В работе",
  PROPOSAL_SENT: "КП отправлено",
  NEGOTIATION: "Переговоры",
  WON: "Выиграна",
  LOST: "Проиграна",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[status] ?? "bg-gray-100 text-gray-500"}`}>
      {STATUS_RU[status] ?? status}
    </span>
  );
}

export function LeadsTable({ rows }: { rows: LeadRowUi[] }) {
  const [sel, setSel] = useState<LeadRowUi | null>(null);
  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
              <th className="p-3">№</th>
              <th className="p-3">Клиент</th>
              <th className="p-3">Контакт</th>
              <th className="p-3">Тип</th>
              <th className="p-3">Цена</th>
              <th className="p-3">Статус</th>
              <th className="p-3">Дата</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id} onClick={() => setSel(l)} className="cursor-pointer border-b border-gray-100 align-top hover:bg-gray-50">
                <td className="p-3 font-mono text-xs text-gray-500">{l.lead_number}</td>
                <td className="p-3">
                  <div className="font-medium text-gray-900">{l.client_name ?? "—"}</div>
                  {l.company && <div className="text-xs text-gray-500">{l.company}</div>}
                </td>
                <td className="p-3 text-gray-600" onClick={(e) => e.stopPropagation()}>
                  {l.email && <div><a className="text-blue-600" href={`mailto:${l.email}`}>{l.email}</a></div>}
                  {l.phone && <div><a className="text-blue-600" href={`tel:${l.phone}`}>{l.phone}</a></div>}
                  {l.telegram && <div className="text-gray-500">{l.telegram}</div>}
                </td>
                <td className="p-3 text-gray-600">{l.project_type ?? "—"}</td>
                <td className="p-3 text-gray-600">{l.calculated_price ? `$${l.calculated_price}` : "—"}</td>
                <td className="p-3"><StatusBadge status={l.status} /></td>
                <td className="p-3 text-gray-500">{(l.created_at ?? "").slice(0, 10)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="p-10 text-center text-gray-400">Заявок нет</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {sel && <LeadDrawer lead={sel} onClose={() => setSel(null)} />}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-gray-100 py-1.5 text-sm">
      <dt className="shrink-0 text-gray-500">{label}</dt>
      <dd className="break-all text-right font-medium text-gray-900">{children}</dd>
    </div>
  );
}

function LeadDrawer({ lead, onClose }: { lead: LeadRowUi; onClose: () => void }) {
  const [pending, start] = useTransition();
  const [status, setStatus] = useState(lead.status);
  const [name, setName] = useState(lead.client_name ?? "");
  const [company, setCompany] = useState(lead.company ?? "");

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <div className="font-mono text-xs text-gray-400">{lead.lead_number}</div>
            <h2 className="text-xl font-bold text-gray-900">{lead.client_name ?? "Без имени"}</h2>
          </div>
          <button onClick={onClose} className="text-2xl leading-none text-gray-400 hover:text-gray-700">×</button>
        </div>

        <label className="mt-4 block text-xs uppercase tracking-wide text-gray-500">Статус</label>
        <select
          value={status}
          disabled={pending}
          onChange={(e) => {
            const s = e.target.value;
            setStatus(s);
            start(async () => { await updateLeadStatus(lead.id, s); });
          }}
          className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
        >
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_RU[s]}</option>)}
        </select>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs uppercase tracking-wide text-gray-500">Имя</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-gray-500">Компания</label>
            <input value={company} onChange={(e) => setCompany(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <button
          disabled={pending}
          onClick={() => start(async () => { await updateLeadFields(lead.id, { client_name: name, company }); })}
          className="mt-2 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "…" : "Сохранить изменения"}
        </button>

        <dl className="mt-5 space-y-0.5">
          <Field label="Email">{lead.email ? <a className="text-blue-600" href={`mailto:${lead.email}`}>{lead.email}</a> : "—"}</Field>
          <Field label="Телефон">{lead.phone ? <a className="text-blue-600" href={`tel:${lead.phone}`}>{lead.phone}</a> : "—"}</Field>
          <Field label="Telegram">{lead.telegram ?? "—"}</Field>
          <Field label="Тип проекта">{lead.project_type ?? "—"}</Field>
          <Field label="Источник">{lead.source ?? "—"}</Field>
          <Field label="Цена">{lead.calculated_price ? `$${lead.calculated_price}` : "—"}</Field>
          <Field label="Создана">{(lead.created_at ?? "").slice(0, 16).replace("T", " ")}</Field>
        </dl>
        {lead.description && (
          <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">{lead.description}</div>
        )}
        {lead.ai_summary && (
          <div className="mt-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">{lead.ai_summary}</div>
        )}

        <button
          disabled={pending}
          onClick={() => {
            if (confirm(`Удалить заявку ${lead.lead_number} безвозвратно?`)) {
              start(async () => { await deleteLead(lead.id); onClose(); });
            }
          }}
          className="mt-6 w-full rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
        >
          Удалить заявку
        </button>
      </div>
    </div>
  );
}

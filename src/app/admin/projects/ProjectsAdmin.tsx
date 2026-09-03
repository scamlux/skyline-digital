"use client";

import { useState, useTransition } from "react";
import { saveProject, deleteProject, type ProjectInput } from "./actions";

export interface ProjectRow extends ProjectInput {
  id: string;
}

const EMPTY: ProjectInput = {
  slug: "", title: "", category: "web", description: "", image: "",
  technologies: [], year: new Date().getFullYear(), url: "", published: true, sort: 0,
};

const INPUT = "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm";

export function ProjectsAdmin({ rows }: { rows: ProjectRow[] }) {
  const [editing, setEditing] = useState<ProjectRow | "new" | null>(null);
  const [pending, start] = useTransition();

  return (
    <>
      <button
        onClick={() => setEditing("new")}
        className="mb-4 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
      >
        + Новый проект
      </button>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
              <th className="p-3">Проект</th>
              <th className="p-3">Категория</th>
              <th className="p-3">Год</th>
              <th className="p-3">Технологии</th>
              <th className="p-3">Статус</th>
              <th className="p-3">Порядок</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} onClick={() => setEditing(p)} className={`cursor-pointer border-b border-gray-100 hover:bg-gray-50 ${p.published ? "" : "opacity-50"}`}>
                <td className="p-3">
                  <div className="font-medium text-gray-900">{p.title}</div>
                  <div className="font-mono text-xs text-gray-400">/{p.slug}</div>
                </td>
                <td className="p-3 text-gray-600">{p.category}</td>
                <td className="p-3 text-gray-600">{p.year ?? "—"}</td>
                <td className="p-3">
                  <div className="flex max-w-xs flex-wrap gap-1">
                    {p.technologies.slice(0, 4).map((t) => (
                      <span key={t} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{t}</span>
                    ))}
                  </div>
                </td>
                <td className="p-3">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${p.published ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                    {p.published ? "опубликован" : "черновик"}
                  </span>
                </td>
                <td className="p-3 text-gray-500">{p.sort}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="p-10 text-center text-gray-400">Проектов нет — примените миграцию 0008</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <Editor
          initial={editing === "new" ? null : editing}
          pending={pending}
          onClose={() => setEditing(null)}
          onSave={(id, input) => start(async () => { await saveProject(id, input); setEditing(null); })}
          onDelete={(id) => {
            if (confirm("Удалить проект из портфолио?")) start(async () => { await deleteProject(id); setEditing(null); });
          }}
        />
      )}
    </>
  );
}

function Editor({
  initial, pending, onClose, onSave, onDelete,
}: {
  initial: ProjectRow | null;
  pending: boolean;
  onClose: () => void;
  onSave: (id: string | null, p: ProjectInput) => void;
  onDelete: (id: string) => void;
}) {
  const [f, setF] = useState<ProjectInput>(initial ?? EMPTY);
  const [tech, setTech] = useState((initial?.technologies ?? []).join(", "));
  const set = (k: keyof ProjectInput, v: unknown) => setF((s) => ({ ...s, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div className="h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-bold text-gray-900">{initial ? "Редактировать проект" : "Новый проект"}</h2>
          <button onClick={onClose} className="text-2xl leading-none text-gray-400 hover:text-gray-700">×</button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div><label className="text-xs uppercase text-gray-500">Название</label>
            <input value={f.title} onChange={(e) => set("title", e.target.value)} className={INPUT} /></div>
          <div><label className="text-xs uppercase text-gray-500">Slug (URL)</label>
            <input value={f.slug} onChange={(e) => set("slug", e.target.value)} className={INPUT} /></div>
          <div><label className="text-xs uppercase text-gray-500">Категория</label>
            <select value={f.category} onChange={(e) => set("category", e.target.value)} className={INPUT}>
              {["web", "mobile", "ai", "automation"].map((c) => <option key={c}>{c}</option>)}
            </select></div>
          <div><label className="text-xs uppercase text-gray-500">Год</label>
            <input type="number" value={f.year ?? ""} onChange={(e) => set("year", Number(e.target.value) || null)} className={INPUT} /></div>
          <div className="col-span-2"><label className="text-xs uppercase text-gray-500">Описание</label>
            <textarea value={f.description} onChange={(e) => set("description", e.target.value)} rows={3} className={INPUT} /></div>
          <div className="col-span-2"><label className="text-xs uppercase text-gray-500">Картинка (путь/URL)</label>
            <input value={f.image} onChange={(e) => set("image", e.target.value)} placeholder="/projects/name.jpg" className={INPUT} /></div>
          <div className="col-span-2"><label className="text-xs uppercase text-gray-500">Технологии (через запятую)</label>
            <input value={tech} onChange={(e) => setTech(e.target.value)} className={INPUT} /></div>
          <div><label className="text-xs uppercase text-gray-500">Ссылка на живой сайт</label>
            <input value={f.url ?? ""} onChange={(e) => set("url", e.target.value || null)} className={INPUT} /></div>
          <div><label className="text-xs uppercase text-gray-500">Порядок</label>
            <input type="number" value={f.sort} onChange={(e) => set("sort", Number(e.target.value) || 0)} className={INPUT} /></div>
          <label className="col-span-2 mt-1 flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={f.published} onChange={(e) => set("published", e.target.checked)} />
            Опубликован (виден на сайте)
          </label>
        </div>

        <button
          disabled={pending || !f.title || !f.slug}
          onClick={() => onSave(initial?.id ?? null, { ...f, technologies: tech.split(",").map((s) => s.trim()).filter(Boolean) })}
          className="mt-4 w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "…" : "Сохранить"}
        </button>
        {initial && (
          <button
            disabled={pending}
            onClick={() => onDelete(initial.id)}
            className="mt-2 w-full rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
          >
            Удалить проект
          </button>
        )}
      </div>
    </div>
  );
}

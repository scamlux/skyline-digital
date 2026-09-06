"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  saveSpecAction, renderAction, approveAction, scheduleAction,
  publishTelegramAction, deletePostAction, previewAction,
} from "./actions";
import type { GuardIssue } from "@/lib/content/types";
import { toTashkentInput, fromTashkent } from "@/lib/content/tz";

const STATUS_RU: Record<string, string> = {
  draft: "черновик", planned: "в плане", generating: "рендер…", generated: "срендерен",
  review: "на проверке", approved: "одобрен", scheduled: "в расписании",
  published: "опубликован", analyzed: "с метриками", failed: "ошибка", blocked: "заблокирован guard",
};

export function statusBadge(s: string) {
  const color =
    s === "published" ? "bg-emerald-50 text-emerald-700"
    : s === "approved" || s === "scheduled" ? "bg-blue-50 text-blue-700"
    : s === "review" ? "bg-violet-50 text-violet-700"
    : s === "blocked" || s === "failed" ? "bg-red-50 text-red-600"
    : "bg-gray-100 text-gray-600";
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${color}`}>{STATUS_RU[s] ?? s}</span>;
}

export function Editor({
  id, initialJson, status, scheduledAt, guard, aspect,
}: {
  id: string | null;
  initialJson: string;
  status: string;
  scheduledAt: string | null;
  guard: GuardIssue[];
  aspect: number; // h/w для превью
}) {
  const router = useRouter();
  const [json, setJson] = useState(initialJson);
  const [issues, setIssues] = useState<GuardIssue[]>(guard);
  const [preview, setPreview] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [when, setWhen] = useState(toTashkentInput(scheduledAt));
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: string; permalink?: string }>, okMsg: string) =>
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? `${okMsg}${r.permalink ? ` → ${r.permalink}` : ""}` : `Ошибка: ${r.error}`);
      router.refresh();
    });

  const BTN = "rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <div className="mb-2 flex items-center gap-3">
          {statusBadge(status)}
          {msg && <span className="text-sm text-gray-600">{msg}</span>}
        </div>
        <textarea
          value={json}
          onChange={(e) => setJson(e.target.value)}
          spellCheck={false}
          rows={30}
          className="w-full rounded-xl border border-gray-300 bg-white p-4 font-mono text-xs leading-relaxed"
        />
        {issues.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs">
            {issues.map((i, k) => (
              <li key={k} className={i.level === "error" ? "text-red-600" : "text-amber-600"}>
                {i.level === "error" ? "⛔" : "⚠️"} {i.code}: {i.message} <span className="text-gray-400">({i.path})</span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <button disabled={pending} className={`${BTN} bg-gray-900 text-white`}
            onClick={() => start(async () => {
              const r = await saveSpecAction(id, json, {});
              setIssues(r.issues);
              setMsg(r.ok ? "Сохранено" : `Ошибка: ${r.error}`);
              if (r.ok && !id && r.id) router.push(`/admin/content/${r.id}`);
              else router.refresh();
            })}>
            {pending ? "…" : "Сохранить"}
          </button>
          <button disabled={pending} className={`${BTN} border border-gray-300 bg-white text-gray-700`}
            onClick={() => start(async () => {
              const r = await previewAction(json);
              setMsg(r.ok ? `Превью: ${r.slides?.length} слайд(ов)` : `Ошибка: ${r.error}`);
              setPreview(r.slides ?? []);
            })}>
            Превью
          </button>
          {id && (
            <>
              <button disabled={pending} className={`${BTN} bg-violet-600 text-white`}
                onClick={() => run(() => renderAction(id), "Срендерено, статус review")}>
                Рендер PNG
              </button>
              {status === "review" && (
                <button disabled={pending} className={`${BTN} bg-emerald-600 text-white`}
                  onClick={() => run(async () => approveAction(id), "Одобрено")}>
                  ✓ Одобрить (человек)
                </button>
              )}
              {["approved", "scheduled"].includes(status) && (
                <button disabled={pending} className={`${BTN} bg-sky-600 text-white`}
                  onClick={() => run(() => publishTelegramAction(id), "Опубликовано в Telegram")}>
                  Опубликовать в Telegram
                </button>
              )}
              <button disabled={pending} className={`${BTN} bg-red-50 text-red-600`}
                onClick={() => { if (confirm("Удалить пост?")) run(async () => { const r = await deletePostAction(id); if (r.ok) router.push("/admin/content"); return r; }, "Удалено"); }}>
                Удалить
              </button>
            </>
          )}
        </div>
        {id && ["approved", "scheduled"].includes(status) && (
          <div className="mt-3 flex items-center gap-2 text-sm">
            <label className="text-gray-500">В расписание:</label>
            <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)}
              className="rounded-lg border border-gray-300 px-2 py-1 text-sm" />
            <button disabled={pending || !when} className={`${BTN} border border-gray-300 bg-white`}
              onClick={() => run(async () => scheduleAction(id, fromTashkent(when)), "Поставлено в расписание")}>
              Запланировать
            </button>
          </div>
        )}
      </div>

      <div>
        <div className="mb-2 text-xs uppercase tracking-wide text-gray-500">
          Превью (HTML, без рендера)
        </div>
        <div className="grid grid-cols-2 gap-3">
          {preview.map((html, i) => (
            <iframe key={i} srcDoc={html} title={`slide-${i}`} sandbox=""
              className="w-full rounded-lg border border-gray-200 bg-white"
              style={{ aspectRatio: `1 / ${aspect}` }} />
          ))}
          {preview.length === 0 && (
            <div className="col-span-2 rounded-xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-400">
              Нажмите «Превью», чтобы увидеть слайды
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

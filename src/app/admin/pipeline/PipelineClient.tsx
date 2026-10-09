"use client";

import { useState, useTransition } from "react";
import { Loader2, Play } from "lucide-react";
import { decide, runNow, saveDraftText } from "./actions";

/** Кнопка внеочередного прогона с итогом. */
export function RunButton() {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={() =>
          start(async () => {
            const s = await runNow();
            const errs = Object.keys(s.errors);
            setResult(
              `Новых: ${s.inserted} · отсеяно: ${s.filtered} · на решение: ${s.review} · карточек: ${s.notified}` +
                (errs.length ? ` · ошибки: ${errs.join(", ")}` : ""),
            );
          })
        }
        disabled={pending}
        className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
        Запустить сейчас
      </button>
      {result && <span className="text-sm text-gray-600">{result}</span>}
    </div>
  );
}

const BUTTONS: Record<string, { action: string; label: string }[]> = {
  review: [
    { action: "go", label: "✅ Подаюсь" },
    { action: "skip", label: "❌ Мимо" },
  ],
  applying: [
    { action: "sent", label: "📤 Отправлено" },
    { action: "won", label: "🏆 Выиграли" },
    { action: "lost", label: "💤 Не взяли" },
  ],
  submitted: [
    { action: "won", label: "🏆 Выиграли" },
    { action: "lost", label: "💤 Не взяли" },
  ],
  rejected: [{ action: "go", label: "✅ Всё же подаюсь" }],
  filtered: [{ action: "go", label: "✅ Всё же подаюсь" }],
};

/** Кнопки статуса + редактор текста отклика. */
export function OpportunityActions({
  id,
  status,
  draftText,
}: {
  id: string;
  status: string;
  draftText: string | null;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [text, setText] = useState(draftText ?? "");
  const buttons = BUTTONS[status] ?? [];

  return (
    <div className="space-y-3">
      {draftText !== null && (
        <div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            className="w-full rounded-lg border border-gray-300 bg-white p-3 font-mono text-xs leading-relaxed"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              disabled={pending || text === draftText}
              onClick={() => start(async () => setMsg((await saveDraftText(id, text)).ok ? "Сохранено" : "Ошибка"))}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs disabled:opacity-50"
            >
              Сохранить текст
            </button>
            <button
              onClick={() => {
                void navigator.clipboard.writeText(text);
                setMsg("Скопировано");
              }}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs"
            >
              Копировать
            </button>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {buttons.map((b) => (
          <button
            key={b.action}
            disabled={pending}
            onClick={() => start(async () => setMsg((await decide(id, b.action)).message))}
            className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
          >
            {b.label}
          </button>
        ))}
        {pending && <Loader2 size={14} className="animate-spin text-gray-500" />}
        {msg && <span className="text-xs text-gray-600">{msg}</span>}
      </div>
    </div>
  );
}

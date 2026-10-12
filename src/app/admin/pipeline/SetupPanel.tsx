"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { connectWebhookAction } from "./actions";
import type { SetupCheck } from "@/lib/pipeline/setup";

/**
 * Чек-лист подключения конвейера. Всё, что можно сделать кнопкой, делается
 * кнопкой: вебхук бота — одним нажатием, скрипт Gmail — копированием готового
 * текста с уже подставленными адресом и секретом.
 */
export function SetupPanel({
  checks,
  gmailScript,
  gmailFilter,
}: {
  checks: SetupCheck[];
  gmailScript: string | null;
  gmailFilter: string;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const allOk = checks.every((c) => c.ok);
  const webhook = checks.find((c) => c.key === "webhook");

  const copy = (key: string, text: string) => {
    void navigator.clipboard.writeText(text);
    setCopied(key);
  };

  return (
    <details open={!allOk} className="mb-6 rounded-xl border border-gray-200 bg-white" id="setup">
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-gray-700">
        Подключение {allOk ? "— всё готово ✅" : `— осталось ${checks.filter((c) => !c.ok).length}`}
      </summary>
      <div className="space-y-5 border-t border-gray-100 p-4">
        <ul className="space-y-2 text-sm" data-testid="setup-checks">
          {checks.map((c) => (
            <li key={c.key} className="flex gap-2" data-check={c.key} data-ok={c.ok}>
              <span>{c.ok ? "✅" : "⬜️"}</span>
              <span className="font-medium text-gray-800">{c.label}</span>
              {!c.ok && <span className="text-gray-500">— {c.hint}</span>}
            </li>
          ))}
        </ul>

        {webhook && !webhook.ok && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              id="connect-webhook"
              disabled={pending}
              onClick={() => start(async () => setMsg((await connectWebhookAction()).message))}
              className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {pending && <Loader2 size={16} className="animate-spin" />}
              Подключить вебхук
            </button>
            {msg && <span className="text-sm text-gray-600">{msg}</span>}
          </div>
        )}

        <div className="space-y-2">
          <div className="text-sm font-semibold text-gray-700">Письма-оповещения из Gmail</div>
          {gmailScript ? (
            <ol className="list-decimal space-y-2 pl-5 text-sm text-gray-700">
              <li>
                Gmail → фильтр: <code className="rounded bg-gray-100 px-1">{gmailFilter}</code> → ярлык{" "}
                <code className="rounded bg-gray-100 px-1">pipeline</code>.{" "}
                <button onClick={() => copy("filter", gmailFilter)} className="text-blue-700 underline">
                  {copied === "filter" ? "скопировано" : "копировать"}
                </button>
              </li>
              <li>
                script.google.com → новый проект → вставить скрипт ниже → сохранить → выбрать функцию{" "}
                <code className="rounded bg-gray-100 px-1">install</code> → «Выполнить» → разрешить доступ.{" "}
                <button id="copy-gmail-script" onClick={() => copy("script", gmailScript)} className="text-blue-700 underline">
                  {copied === "script" ? "скопировано" : "копировать скрипт"}
                </button>
              </li>
            </ol>
          ) : (
            <p className="text-sm text-gray-500">Появится после установки PIPELINE_INGEST_SECRET в Vercel и редеплоя.</p>
          )}
          {gmailScript && (
            <pre id="gmail-script" className="max-h-56 overflow-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-700">
              {gmailScript}
            </pre>
          )}
        </div>
      </div>
    </details>
  );
}

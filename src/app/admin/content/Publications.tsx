"use client";

import { useState, useTransition } from "react";
import { retryPublicationAction, markPublishedManuallyAction } from "./actions";

export interface PublicationRow {
  platform: string;
  status: string;
  error: string | null;
  permalink: string | null;
  published_at: string | null;
}

const API_PLATFORMS = new Set(["telegram", "instagram"]);

/** Публикации поста по площадкам + «Повторить» / «Опубликовано вручную» (§1.4/§1.5). */
export function Publications({
  postId,
  platforms,
  publications,
  canPublish,
}: {
  postId: string;
  platforms: string[];
  publications: PublicationRow[];
  canPublish: boolean;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const byPlatform = new Map(publications.map((p) => [p.platform, p]));

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) =>
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? okMsg : `Ошибка: ${r.error ?? "неизвестно"}`);
    });

  return (
    <div className="mt-8 rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3 text-sm font-semibold text-gray-900">Публикации</div>
      {msg && <div className="mb-3 rounded bg-gray-50 px-3 py-2 text-sm text-gray-700">{msg}</div>}
      <div className="space-y-2">
        {platforms.map((platform) => {
          const pub = byPlatform.get(platform);
          const isApi = API_PLATFORMS.has(platform);
          const status = pub?.status ?? "—";
          const color =
            status === "published"
              ? "text-emerald-700"
              : status === "failed"
                ? "text-red-600"
                : status === "manual"
                  ? "text-amber-600"
                  : "text-gray-400";
          return (
            <div key={platform} className="flex flex-wrap items-center gap-2 border-b border-gray-100 pb-2 text-sm">
              <span className="w-24 font-medium capitalize">{platform}</span>
              <span className={`w-24 ${color}`}>{status}</span>
              {pub?.permalink && (
                <a href={pub.permalink} target="_blank" rel="noreferrer" className="text-sky-600 underline">
                  ссылка
                </a>
              )}
              {pub?.error && <span className="text-xs text-red-500">{pub.error}</span>}
              <span className="ml-auto flex gap-2">
                {isApi && canPublish && (status === "failed" || status === "—" || !pub) && (
                  <button
                    disabled={pending}
                    onClick={() => run(() => retryPublicationAction(postId, platform), "Отправлено")}
                    className="rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-50"
                  >
                    {status === "failed" ? "Повторить" : "Опубликовать"}
                  </button>
                )}
                {!isApi && status !== "published" && (
                  <button
                    disabled={pending}
                    onClick={() => run(() => markPublishedManuallyAction(postId, platform), "Отмечено")}
                    className="rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-50"
                  >
                    Опубликовано вручную
                  </button>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

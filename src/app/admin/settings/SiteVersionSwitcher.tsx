"use client";

import { useState, useTransition } from "react";
import { saveSetting } from "@/app/admin/projects/actions";
import {
  BRAND_ACCENTS,
  BRAND_ACCENT_KEYS,
  SITE_VERSIONS,
  SITE_VERSION_LABELS,
  type BrandAccent,
  type SiteVersion,
} from "@/lib/site/version";

/**
 * Переключатели «Версия сайта» и «Акцент бренда» (docs/plan-site-versions.md §4).
 * Пишут в `settings` через `saveSetting`; сервер валидирует значение и
 * ревалидирует весь публичный сайт.
 */
export function SiteVersionSwitcher({
  version: initialVersion,
  accent: initialAccent,
}: {
  version: SiteVersion;
  accent: BrandAccent;
}) {
  const [version, setVersion] = useState(initialVersion);
  const [accent, setAccent] = useState(initialAccent);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save(key: "site_version" | "brand_accent", value: string, apply: () => void, rollback: () => void) {
    apply();
    setMsg(null);
    start(async () => {
      const r = await saveSetting(key, JSON.stringify(value));
      if (r.ok) setMsg("Сохранено — сайт обновится при следующем открытии страницы.");
      else {
        rollback();
        setMsg(`Ошибка: ${r.error ?? "не удалось сохранить"}`);
      }
    });
  }

  return (
    <div className="mb-6 space-y-5 rounded-xl border border-gray-200 bg-white p-5">
      <div>
        <div className="mb-2 text-sm font-semibold text-gray-900">Версия сайта</div>
        <div role="radiogroup" aria-label="Версия сайта" className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
          {SITE_VERSIONS.map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={version === v}
              disabled={pending}
              onClick={() => {
                if (v === version) return;
                const prev = version;
                save("site_version", v, () => setVersion(v), () => setVersion(prev));
              }}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition disabled:opacity-60 ${
                version === v ? "bg-gray-900 text-white shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {SITE_VERSION_LABELS[v]}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Studio и Референс включаются постранично: страница без готового варианта показывается в старом дизайне.
        </p>
      </div>

      <div>
        <div className="mb-2 text-sm font-semibold text-gray-900">
          Акцент бренда <span className="font-normal text-gray-500">— {BRAND_ACCENTS[accent].label}</span>
        </div>
        <div role="radiogroup" aria-label="Акцент бренда" className="flex gap-2">
          {BRAND_ACCENT_KEYS.map((a) => (
            <button
              key={a}
              type="button"
              role="radio"
              aria-checked={accent === a}
              aria-label={BRAND_ACCENTS[a].label}
              title={BRAND_ACCENTS[a].label}
              disabled={pending}
              onClick={() => {
                if (a === accent) return;
                const prev = accent;
                save("brand_accent", a, () => setAccent(a), () => setAccent(prev));
              }}
              style={{ backgroundColor: BRAND_ACCENTS[a].acc }}
              className={`h-9 w-9 rounded-full border-2 transition disabled:opacity-60 ${
                accent === a ? "border-gray-900 ring-2 ring-gray-900 ring-offset-2" : "border-white"
              }`}
            />
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-500">Меняет основной цвет Studio и Референса; старый дизайн не затрагивает.</p>
      </div>

      {msg && <div className="text-sm text-gray-700">{msg}</div>}
    </div>
  );
}

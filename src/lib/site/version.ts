/**
 * Варианты публичного сайта и акцент бренда (docs/plan-site-versions.md, ADR 0007).
 *
 * Чистые типы и правила — без обращения к БД, чтобы их можно было импортировать
 * и в серверные, и в клиентские модули, и покрыть тестами. Чтение настроек из
 * БД — в `./active.ts` (server-only).
 */

export const SITE_VERSIONS = ["old", "studio", "ref"] as const;
export type SiteVersion = (typeof SITE_VERSIONS)[number];
export const DEFAULT_SITE_VERSION: SiteVersion = "old";

export const SITE_VERSION_LABELS: Record<SiteVersion, string> = {
  old: "Старый",
  studio: "Studio",
  ref: "Референс",
};

/** Пресеты акцента — точные значения из эталона (THEMES в docs/reference/artifact-skyline.html). */
export const BRAND_ACCENTS = {
  "dark-blue": { label: "Тёмно-синий", acc: "#27406b", ink: "#8fa6cf" },
  burgundy: { label: "Бургунди", acc: "#7a2638", ink: "#cf8793" },
  khaki: { label: "Хаки", acc: "#6d6a40", ink: "#bcb784" },
  "dark-green": { label: "Тёмно-зелёный", acc: "#2f5141", ink: "#88b39c" },
  brass: { label: "Латунь", acc: "#8a5a2b", ink: "#caa06a" },
} as const;
export type BrandAccent = keyof typeof BRAND_ACCENTS;
export const BRAND_ACCENT_KEYS = Object.keys(BRAND_ACCENTS) as BrandAccent[];
export const DEFAULT_BRAND_ACCENT: BrandAccent = "dark-blue";

export function isSiteVersion(v: unknown): v is SiteVersion {
  return typeof v === "string" && (SITE_VERSIONS as readonly string[]).includes(v);
}

export function isBrandAccent(v: unknown): v is BrandAccent {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(BRAND_ACCENTS, v);
}

/** Значение из `settings.value` (jsonb) → версия; всё неизвестное → `old`. */
export function parseSiteVersion(v: unknown): SiteVersion {
  return isSiteVersion(v) ? v : DEFAULT_SITE_VERSION;
}

export function parseBrandAccent(v: unknown): BrandAccent {
  return isBrandAccent(v) ? v : DEFAULT_BRAND_ACCENT;
}

/**
 * Какой вариант реально рендерить на странице. Если у страницы ещё нет
 * запрошенного варианта — вся страница (каркас + тело) уходит на `old`,
 * чтобы не было «наполовину нового» экрана.
 */
export function resolveVariant(
  requested: SiteVersion,
  available: Partial<Record<SiteVersion, unknown>>,
): SiteVersion {
  return available[requested] ? requested : DEFAULT_SITE_VERSION;
}

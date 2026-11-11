import type { Locale, StyleId } from "../types";

/**
 * Компактная нагрузка deep-ссылки «Получить сводку в Telegram» (`t.me/<бот>?start=<payload>`).
 * Чистые функции без React и без импортов студии (ADR 0009): так же работает в экспортированном сайте.
 *
 * Формат v1. Telegram разрешает в `start` до 64 символов из [A-Za-z0-9_-]:
 *
 *   1 <tpl> <loc> <style> <period> - <v1> - <v2> - … - <vN>
 *
 *   «1»     версия формата (при смене схемы полей — «2», старые ссылки перестают разбираться, а не врут);
 *   <tpl>   r ресторан · c клиника · s салон · f кафе;
 *   <loc>   r ru · e en · u uz;
 *   <style> a | b (у салона — выбранный бизнес, у остальных всегда «a»);
 *   <period> w = последние 7 дней;
 *   <vN>    целые числа в base36 строчными, в порядке полей DIGEST_FIELDS[tpl] (порядок ключей — часть формата).
 *
 * Пример: `1rraw-c-8-5-8w-k` = ресторан, ru, стиль a, 7 дней: 12 заявок, 8 звонков, 5 переходов в Telegram,
 * 320 визитов, пик в дни с маской 20 (ср и пт). Числа зажимаются в границы при кодировании и проверяются
 * при разборе: ссылку можно подделать, поэтому сервер ничему в ней не верит сверх границ.
 */

export type DigestTemplate = "restaurant" | "clinic" | "salon" | "cafe";
export type DigestPeriod = "week";

export const DIGEST_FORMAT_VERSION = "1";
/** Лимит Telegram на параметр /start. */
export const START_PAYLOAD_MAX_LENGTH = 64;

/** Верхние границы: счётчики событий, суммы в сумах, код позиции (индекс + 1, 0 = нет), маска дней недели. */
export const COUNT_MAX = 99_999;
export const SUM_MAX = 9_999_999_999;
export const CODE_MAX = 63;
export const WEEKDAY_MASK_MAX = 0b1111111;

/**
 * Поля нагрузки по шаблонам: имя → максимум. Порядок ключей = порядок в ссылке.
 * `peak` — маска дней недели (бит 0 = пн), `svc`/`master`/`drink` — индекс позиции в каталоге + 1.
 */
export const DIGEST_FIELDS = {
  restaurant: { leads: COUNT_MAX, calls: COUNT_MAX, telegram: COUNT_MAX, views: COUNT_MAX, peak: WEEKDAY_MASK_MAX },
  clinic: { bookings: COUNT_MAX, calcs: COUNT_MAX, calls: COUNT_MAX, telegram: COUNT_MAX, views: COUNT_MAX, svc: CODE_MAX, peak: WEEKDAY_MASK_MAX },
  salon: { bookings: COUNT_MAX, revenue: SUM_MAX, quizzes: COUNT_MAX, calls: COUNT_MAX, telegram: COUNT_MAX, views: COUNT_MAX, svc: CODE_MAX, master: CODE_MAX, masterN: COUNT_MAX },
  cafe: { orders: COUNT_MAX, revenue: SUM_MAX, avg: SUM_MAX, views: COUNT_MAX, drink: CODE_MAX },
} as const satisfies Record<DigestTemplate, Record<string, number>>;

export type DigestValues<T extends DigestTemplate> = { -readonly [K in keyof (typeof DIGEST_FIELDS)[T]]: number };

export type DigestPayload = {
  [T in DigestTemplate]: { tpl: T; locale: Locale; style: StyleId; period: DigestPeriod; values: DigestValues<T> };
}[DigestTemplate];

const TPL_CODE: Record<DigestTemplate, string> = { restaurant: "r", clinic: "c", salon: "s", cafe: "f" };
const LOCALE_CODE: Record<Locale, string> = { ru: "r", en: "e", uz: "u" };
const PERIOD_CODE: Record<DigestPeriod, string> = { week: "w" };

const invert = <K extends string>(map: Record<K, string>): Record<string, K> => Object.fromEntries((Object.keys(map) as K[]).map((k) => [map[k], k]));
const TPL_BY_CODE = invert(TPL_CODE);
const LOCALE_BY_CODE = invert(LOCALE_CODE);

const START_CHARS = /^[A-Za-z0-9_-]+$/;
const HEADER = /^1([rcsf])([reu])([ab])w$/;
const NUMBER_CHARS = /^[0-9a-z]{1,8}$/;
const SEPARATOR = "-";

const clamp = (n: number, max: number): number => (Number.isFinite(n) ? Math.min(max, Math.max(0, Math.round(n))) : 0);

/** Кодирует нагрузку в строку для `?start=`. Числа зажимаются в границы схемы. */
export function encodeDigest(p: DigestPayload): string {
  const fields = DIGEST_FIELDS[p.tpl] as Record<string, number>;
  const values = p.values as Record<string, number>;
  const header = `${DIGEST_FORMAT_VERSION}${TPL_CODE[p.tpl]}${LOCALE_CODE[p.locale]}${p.style}${PERIOD_CODE[p.period]}`;
  const body = Object.keys(fields).map((k) => clamp(values[k] ?? 0, fields[k]).toString(36));
  return [header, ...body].join(SEPARATOR);
}

/** Разбирает строку из `?start=`. Любое отклонение от схемы и границ — `null`, без исключений. */
export function decodeDigest(raw: unknown): DigestPayload | null {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > START_PAYLOAD_MAX_LENGTH || !START_CHARS.test(raw)) return null;
  const [header, ...parts] = raw.split(SEPARATOR);
  const m = HEADER.exec(header);
  if (!m) return null;
  const tpl = TPL_BY_CODE[m[1]] as DigestTemplate | undefined;
  const locale = LOCALE_BY_CODE[m[2]] as Locale | undefined;
  if (!tpl || !locale) return null;
  const fields = DIGEST_FIELDS[tpl] as Record<string, number>;
  const keys = Object.keys(fields);
  if (parts.length !== keys.length) return null;
  const values: Record<string, number> = {};
  for (let i = 0; i < keys.length; i++) {
    if (!NUMBER_CHARS.test(parts[i])) return null;
    const n = parseInt(parts[i], 36);
    if (n > fields[keys[i]]) return null;
    values[keys[i]] = n;
  }
  return { tpl, locale, style: m[3] as StyleId, period: "week", values } as DigestPayload;
}

/** Маска дней недели (бит 0 = пн) из списка индексов 0..6. */
export const weekdaysToMask = (days: readonly number[]): number => days.reduce((mask, d) => (d >= 0 && d <= 6 ? mask | (1 << d) : mask), 0);

/** Индексы дней недели (0 = пн) из маски. */
export const maskToWeekdays = (mask: number): number[] => Array.from({ length: 7 }, (_, d) => d).filter((d) => (mask & (1 << d)) !== 0);

/** Код позиции каталога для нагрузки: индекс + 1, 0 = «нет». Позиций больше CODE_MAX не кодируем. */
export const itemCode = (index: number): number => (index >= 0 && index < CODE_MAX ? index + 1 : 0);

/** Имя бота Telegram: 5–32 символа, латиница/цифры/_, начинается с буквы. Лишнее («@», пробелы) срезается. */
export function normalizeBotUsername(raw: string | undefined | null): string | undefined {
  const name = (raw ?? "").trim().replace(/^@/, "");
  return /^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(name) ? name : undefined;
}

/** Ссылка `https://t.me/<бот>?start=<payload>`. */
export const digestDeepLink = (bot: string, payload: DigestPayload): string => `https://t.me/${bot}?start=${encodeDigest(payload)}`;

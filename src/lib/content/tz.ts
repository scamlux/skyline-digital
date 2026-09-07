/**
 * Asia/Tashkent time helpers (ПРОМПТ-3 §1.1).
 *
 * Storage is `timestamptz` — always UTC. The admin shows and accepts times as
 * Tashkent wall-clock. Uzbekistan is UTC+5 year-round (no DST since 1992), so a
 * fixed offset is correct and dependency-free; do NOT reach for a TZ library.
 *
 * Vercel Cron runs in UTC and compares `scheduled_at <= now()`, so as long as
 * `scheduled_at` is stored as the correct UTC instant the cron cadence is
 * timezone-agnostic. These helpers guarantee that instant is computed from
 * Tashkent wall-clock input, never from the server's or browser's local zone.
 */

export const TASHKENT_OFFSET_MIN = 5 * 60;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** UTC ISO → `"YYYY-MM-DDTHH:mm"` Tashkent wall time (for `<input datetime-local>`). */
export function toTashkentInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const d = new Date(t + TASHKENT_OFFSET_MIN * 60_000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** UTC ISO → `"YYYY-MM-DD HH:mm"` Tashkent wall time (for display). */
export function toTashkentDisplay(iso: string | null | undefined): string {
  const s = toTashkentInput(iso);
  return s ? s.replace("T", " ") : "";
}

/** Day-of-month (1–31) of a UTC instant in Tashkent — for the calendar grid. */
export function tashkentDayOfMonth(iso: string): number {
  const d = new Date(Date.parse(iso) + TASHKENT_OFFSET_MIN * 60_000);
  return d.getUTCDate();
}

/**
 * Tashkent wall time → UTC ISO string.
 * Accepts `"YYYY-MM-DDTHH:mm[:ss]"` or `"YYYY-MM-DD HH:mm[:ss]"`. The input is
 * interpreted as Tashkent local time regardless of the running environment.
 */
export function fromTashkent(local: string): string {
  const m = local
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) throw new Error(`fromTashkent: не разобрать дату «${local}»`);
  const [, y, mo, d, h, mi, s] = m;
  const utc =
    Date.UTC(+y, +mo - 1, +d, +h, +mi, s ? +s : 0) - TASHKENT_OFFSET_MIN * 60_000;
  return new Date(utc).toISOString();
}

/** Plan `date` (`YYYY-MM-DD`) + `time` (`HH:mm`) in Tashkent → UTC ISO. */
export function tashkentDateTimeToUtc(date: string, time: string): string {
  return fromTashkent(`${date}T${(time || "00:00").slice(0, 5)}`);
}

/** UTC ISO of the first instant of a Tashkent calendar month (for range queries). */
export function tashkentMonthStartUtc(year: number, month1: number): string {
  return fromTashkent(`${year}-${pad(month1)}-01T00:00`);
}

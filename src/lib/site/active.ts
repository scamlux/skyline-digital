import "server-only";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  DEFAULT_BRAND_ACCENT,
  DEFAULT_SITE_VERSION,
  parseBrandAccent,
  parseSiteVersion,
  type BrandAccent,
  type SiteVersion,
} from "./version";

/**
 * Чтение активного варианта и акцента из `settings`.
 *
 * Отличие от `getSetting`: ошибка БД здесь **бросается**, а не превращается в
 * фолбэк. Иначе кратковременный сбой Supabase во время перегенерации страницы
 * запёк бы `old` в кэш и молча переключил бы прод обратно. При исключении Next
 * продолжает отдавать последнюю удачную версию страницы.
 *
 * Фолбэк — только когда Supabase не настроен или строки ещё нет (миграция 0013
 * не применена): тогда сайт работает как сейчас.
 */
async function readSetting(key: string): Promise<unknown> {
  if (!isSupabaseConfigured()) return undefined;
  const { data, error } = await getSupabaseAdmin()
    .from("settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) throw new Error(`settings.${key}: ${error.message}`);
  return data?.value;
}

/**
 * Локальное превью без записи в БД: `SITE_VERSION_OVERRIDE` / `BRAND_ACCENT_OVERRIDE`
 * при `next build`/`next start`. На проде (VERCEL_ENV=production) игнорируются,
 * поэтому случайно забытая переменная не переключит боевой сайт.
 */
function override(name: string): string | undefined {
  if (process.env.VERCEL_ENV === "production") return undefined;
  return process.env[name] || undefined;
}

export async function getActiveVersion(): Promise<SiteVersion> {
  const forced = override("SITE_VERSION_OVERRIDE");
  if (forced) return parseSiteVersion(forced);
  const value = await readSetting("site_version");
  return value === undefined ? DEFAULT_SITE_VERSION : parseSiteVersion(value);
}

export async function getBrandAccent(): Promise<BrandAccent> {
  const forced = override("BRAND_ACCENT_OVERRIDE");
  if (forced) return parseBrandAccent(forced);
  const value = await readSetting("brand_accent");
  return value === undefined ? DEFAULT_BRAND_ACCENT : parseBrandAccent(value);
}

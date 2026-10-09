import "server-only";
import { headers } from "next/headers";

/**
 * Боевой адрес сайта для вебхука и скрипта Gmail: NEXT_PUBLIC_SITE_URL, а без
 * него — хост, на котором открыта админка (владелец открывает боевой домен).
 */
export async function currentSiteUrl(): Promise<string> {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

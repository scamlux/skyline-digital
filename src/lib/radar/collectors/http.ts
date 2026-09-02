/** HTTP helpers for collectors: UA rotation, timeout, one backoff retry. */

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
];

export function pickUserAgent(i = 0): string {
  return USER_AGENTS[Math.abs(i) % USER_AGENTS.length];
}

export const sleep = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

export interface FetchResult {
  ok: boolean;
  status: number;
  html: string;
  finalUrl: string;
}

export interface FetchOptions {
  userAgent?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  retries?: number;
}

/** GET a page as text, with a hard timeout and exponential backoff on failure. */
export async function fetchHtml(url: string, opts: FetchOptions = {}): Promise<FetchResult> {
  const doFetch = opts.fetchImpl ?? fetch;
  const timeoutMs = opts.timeoutMs ?? 15000;
  const retries = opts.retries ?? 1;
  let attempt = 0;
  let lastErr: unknown;
  while (attempt <= retries) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await doFetch(url, {
        signal: controller.signal,
        redirect: "follow",
        headers: {
          "user-agent": opts.userAgent ?? pickUserAgent(attempt),
          accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
          "accept-language": "ru,uz;q=0.9,en;q=0.8",
        },
      });
      const html = await res.text();
      clearTimeout(timer);
      if (res.status === 429 || res.status >= 500) {
        // rate-limited / server error → backoff and retry
        lastErr = new Error(`HTTP ${res.status}`);
        if (attempt < retries) await sleep(1000 * 2 ** attempt);
        attempt++;
        continue;
      }
      return { ok: res.ok, status: res.status, html, finalUrl: res.url || url };
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (attempt < retries) await sleep(1000 * 2 ** attempt);
      attempt++;
    }
  }
  return { ok: false, status: 0, html: "", finalUrl: url };
}

export function absoluteUrl(href: string, base: string): string | null {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

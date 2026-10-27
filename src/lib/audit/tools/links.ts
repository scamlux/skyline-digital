import { AUDIT_USER_AGENT, GuardError, type RequestGuard } from "../guard";

/**
 * Broken-links checker (engine 2.1, ADR 0010) — report and batch mode only.
 *
 * Checks up to {@link MAX_LINKS} same-host links found on the page. Every
 * request and every redirect hop goes through the audit's SSRF guard; a link
 * that points at a private address is counted as BLOCKED, never fetched.
 * HEAD first (falls back to GET when the server refuses HEAD), body never read.
 */

export const MAX_LINKS = 30;
const CONCURRENCY = 4;
const TIMEOUT_MS = 5_000;
const MAX_HOPS = 3;

export interface LinkCheck {
  checked: number;
  /** Links answering 4xx/5xx or not answering at all, capped. */
  broken: { url: string; status: number | null }[];
  blocked: number;
}

type Outcome = { kind: "ok" } | { kind: "broken"; status: number | null } | { kind: "blocked" };

async function probe(url: string, guard: RequestGuard, fetchImpl: typeof fetch): Promise<Outcome> {
  let current = url;
  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    try {
      await guard(current);
    } catch (err) {
      if (err instanceof GuardError && err.code === "DNS_FAILED") return { kind: "broken", status: null };
      return { kind: "blocked" };
    }
    let res: Response | null = null;
    for (const method of ["HEAD", "GET"] as const) {
      try {
        res = await fetchImpl(current, {
          method,
          redirect: "manual",
          signal: AbortSignal.timeout(TIMEOUT_MS),
          headers: { "user-agent": AUDIT_USER_AGENT },
        });
        await res.body?.cancel().catch(() => {});
      } catch {
        res = null;
      }
      // Some servers refuse HEAD (405/403/501) — retry once with GET.
      if (res && method === "HEAD" && [403, 405, 501].includes(res.status)) continue;
      break;
    }
    if (!res) return { kind: "broken", status: null };
    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) {
      current = new URL(loc, current).toString();
      continue;
    }
    return res.status >= 400 ? { kind: "broken", status: res.status } : { kind: "ok" };
  }
  return { kind: "broken", status: null }; // redirect loop
}

export async function checkLinks(
  links: string[],
  guard: RequestGuard,
  opts: { fetchImpl?: typeof fetch; max?: number } = {},
): Promise<LinkCheck> {
  const list = [...new Set(links)].slice(0, opts.max ?? MAX_LINKS);
  const fetchImpl = opts.fetchImpl ?? fetch;
  const result: LinkCheck = { checked: 0, broken: [], blocked: 0 };
  let next = 0;
  async function worker() {
    while (next < list.length) {
      const url = list[next++];
      const o = await probe(url, guard, fetchImpl);
      result.checked++;
      if (o.kind === "blocked") result.blocked++;
      else if (o.kind === "broken" && result.broken.length < 10) result.broken.push({ url, status: o.status });
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, list.length) }, worker));
  return result;
}

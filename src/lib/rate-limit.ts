import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limiting for public routes.
 *
 * Preferred backend is Upstash Redis (distributed — works across all Vercel
 * lambda instances). When no Upstash credentials are present (local dev, or
 * before the integration is connected) it degrades to a per-instance in-memory
 * limiter, which is what this module used to be: a cheap first line of defense
 * paired with the form honeypot.
 *
 * Env (either naming works — the Vercel/Upstash marketplace integration injects
 * KV_*, a direct Upstash integration injects UPSTASH_*):
 *   UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
 *   KV_REST_API_URL        / KV_REST_API_TOKEN
 */

const REST_URL =
  process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? "";
const REST_TOKEN =
  process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? "";

/** Whether the distributed limiter is available. */
export function isDistributedRateLimit(): boolean {
  return Boolean(REST_URL && REST_TOKEN);
}

let redis: Redis | null = null;
const limiters = new Map<string, Ratelimit>();

/** One Ratelimit instance per (limit, window) pair — they are cheap but not free. */
function getLimiter(limit: number, windowMs: number): Ratelimit | null {
  if (!isDistributedRateLimit()) return null;
  redis ??= new Redis({ url: REST_URL, token: REST_TOKEN });
  const key = `${limit}:${windowMs}`;
  let rl = limiters.get(key);
  if (!rl) {
    rl = new Ratelimit({
      redis,
      // Sliding window: no burst at the window boundary, unlike fixed windows.
      limiter: Ratelimit.slidingWindow(limit, `${Math.ceil(windowMs / 1000)} s`),
      prefix: "skyline:rl",
      analytics: false,
    });
    limiters.set(key, rl);
  }
  return rl;
}

// ————————————————— in-memory fallback —————————————————

const hits = new Map<string, number[]>();

function memoryAllow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) {
    hits.set(key, arr);
    return false;
  }
  arr.push(now);
  hits.set(key, arr);
  // Opportunistic cleanup to bound memory.
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= windowMs)) hits.delete(k);
    }
  }
  return true;
}

// ————————————————— public API —————————————————

/** Best-effort client IP from proxy headers. */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Returns true when the request is allowed. Default: 5 requests per key per
 * 10 minutes (e.g. key "contact:1.2.3.4").
 *
 * Never throws: if Redis is unreachable we fall back to the in-memory limiter
 * rather than taking the form down.
 */
export async function rateLimit(
  key: string,
  { limit = 5, windowMs = 10 * 60_000 }: { limit?: number; windowMs?: number } = {},
): Promise<boolean> {
  const rl = getLimiter(limit, windowMs);
  if (rl) {
    try {
      const { success } = await rl.limit(key);
      return success;
    } catch (err) {
      console.error("[rate-limit] Upstash unavailable, using in-memory:", err);
    }
  }
  return memoryAllow(key, limit, windowMs);
}

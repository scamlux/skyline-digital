import "server-only";

/**
 * Minimal in-memory rate limiter. On serverless this is per-instance (not
 * global), so it's a cheap first line of defense against bursts / spam, paired
 * with the form honeypot. No Redis/queue — matches the MVP architecture.
 */
const hits = new Map<string, number[]>();

/** Best-effort client IP from proxy headers. */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Returns true when the request is allowed. Default: 5 requests per IP per
 * 10 minutes for a given bucket (e.g. "lead").
 */
export function rateLimit(
  key: string,
  { limit = 5, windowMs = 10 * 60_000 }: { limit?: number; windowMs?: number } = {},
): boolean {
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

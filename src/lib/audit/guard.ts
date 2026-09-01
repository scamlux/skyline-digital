import { lookup as dnsLookup } from "node:dns/promises";
import net from "node:net";

/**
 * SSRF guard for the audit engine — see docs/TZ-AUDIT-ENGINE.md §3.
 *
 * `/audit` (and the radar) make OUR server fetch a URL supplied by an untrusted
 * caller. Without this guard an attacker can point us at the cloud metadata
 * endpoint (169.254.169.254), loopback, or the internal network. Every rule
 * here runs BEFORE any request, and every redirect hop is re-checked — a public
 * domain that 302s to a private IP must not slip through.
 *
 * DNS resolution and fetch are injectable so the whole thing is unit-testable
 * without real network access.
 */

/** Subset of AuditErrorCode the guard can raise (kept in sync with types.ts). */
export type GuardCode = "INVALID_URL" | "BLOCKED_ADDRESS" | "DNS_FAILED";

export class GuardError extends Error {
  constructor(
    readonly code: GuardCode,
    readonly detail?: string,
  ) {
    super(`${code}${detail ? `: ${detail}` : ""}`);
    this.name = "GuardError";
  }
}

const ALLOWED_SCHEMES = new Set(["http:", "https:"]);
/** Only default ports — arbitrary ports are a common SSRF pivot. */
const ALLOWED_PORTS = new Set(["", "80", "443"]);
const BLOCKED_HOST_EXACT = new Set(["localhost"]);
const BLOCKED_HOST_SUFFIXES = [".local", ".internal", ".localhost"];

/** Resolves a hostname to a list of IP strings. Injectable for tests. */
export type Resolver = (host: string) => Promise<string[]>;

const defaultResolver: Resolver = async (host) => {
  const records = await dnsLookup(host, { all: true });
  return records.map((r) => r.address);
};

/**
 * The dedup / "same site" key: the lowercased hostname. Radar idempotency and
 * audit history both key on this, so `example.uz`, `http://example.uz` and
 * `https://Example.UZ/path?a=1#h` collapse to one key (§10).
 */
export function hostKey(input: string): string {
  const u = new URL(normalizeUrl(input));
  return u.hostname.toLowerCase().replace(/\.$/, "");
}

/**
 * Canonical URL used for fetching: add a scheme when missing (default https),
 * lowercase the host, drop the fragment. Throws INVALID_URL on garbage.
 */
export function normalizeUrl(input: string): string {
  const raw = input.trim();
  if (!raw) throw new GuardError("INVALID_URL", "empty");
  // Detect an explicit scheme ("http://", "data:", "ftp://"). A bare host with
  // a port ("example.uz:8080") has digits after the colon — that's not a
  // scheme, so we still prepend https://.
  const schemeMatch = raw.match(/^([a-z][a-z0-9+.-]*):(.*)$/i);
  const hasScheme = Boolean(schemeMatch) && !/^\d/.test(schemeMatch![2]);
  const withScheme = hasScheme ? raw : `https://${raw}`;
  let u: URL;
  try {
    u = new URL(withScheme);
  } catch {
    throw new GuardError("INVALID_URL", raw);
  }
  // Hostname may be empty for non-authority schemes (file:, data:) — those are
  // rejected by scheme in guardUrl, so don't fail here.
  u.hostname = u.hostname.toLowerCase();
  u.hash = "";
  return u.toString();
}

/** Blocked by name before we even resolve DNS. */
export function isBlockedHostname(host: string): boolean {
  const h = host.toLowerCase().replace(/\.$/, "");
  if (BLOCKED_HOST_EXACT.has(h)) return true;
  return BLOCKED_HOST_SUFFIXES.some((s) => h.endsWith(s));
}

// ————————————————————— IP range checks —————————————————————

function ipv4ToInt(ip: string): number {
  const parts = ip.split(".").map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

/** IPv4 CIDRs that must never be reachable. */
const BLOCKED_V4: Array<[string, number]> = [
  ["0.0.0.0", 8], // "this" network, includes 0.0.0.0
  ["10.0.0.0", 8], // private
  ["100.64.0.0", 10], // CGNAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local + cloud metadata 169.254.169.254
  ["172.16.0.0", 12], // private
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.168.0.0", 16], // private
  ["198.18.0.0", 15], // benchmarking
];

function isBlockedV4(ip: string): boolean {
  const addr = ipv4ToInt(ip);
  return BLOCKED_V4.some(([net, bits]) => {
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    return (addr & mask) === (ipv4ToInt(net) & mask);
  });
}

/** Expand an IPv6 address to its 16 bytes. Returns null if unparseable. */
function ipv6ToBytes(ip: string): number[] | null {
  let s = ip;
  // Strip zone id (fe80::1%eth0) and brackets.
  s = s.replace(/%.*$/, "").replace(/^\[|\]$/g, "");
  const embeddedV4 = s.match(/(\d+\.\d+\.\d+\.\d+)$/);
  let tail: number[] = [];
  if (embeddedV4) {
    tail = embeddedV4[1].split(".").map(Number);
    s = s.slice(0, s.length - embeddedV4[1].length) + "0:0";
  }
  const halves = s.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const back = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const groups: string[] = [];
  if (halves.length === 2) {
    const missing = 8 - head.length - back.length;
    if (missing < 0) return null;
    groups.push(...head, ...Array(missing).fill("0"), ...back);
  } else {
    if (head.length !== 8) return null;
    groups.push(...head);
  }
  const bytes: number[] = [];
  for (const g of groups) {
    const v = parseInt(g || "0", 16);
    if (Number.isNaN(v) || v < 0 || v > 0xffff) return null;
    bytes.push((v >> 8) & 0xff, v & 0xff);
  }
  if (embeddedV4) {
    bytes.splice(12, 4, ...tail);
  }
  return bytes.length === 16 ? bytes : null;
}

function isBlockedV6(ip: string): boolean {
  const b = ipv6ToBytes(ip);
  if (!b) return true; // unparseable → refuse
  // IPv4-mapped ::ffff:a.b.c.d — check the embedded v4 (classic bypass).
  const isMapped = b.slice(0, 10).every((x) => x === 0) && b[10] === 0xff && b[11] === 0xff;
  if (isMapped) return isBlockedV4(b.slice(12).join("."));
  // ::  unspecified, ::1 loopback
  if (b.every((x) => x === 0)) return true;
  if (b.slice(0, 15).every((x) => x === 0) && b[15] === 1) return true;
  // fc00::/7 unique-local
  if ((b[0] & 0xfe) === 0xfc) return true;
  // fe80::/10 link-local
  if (b[0] === 0xfe && (b[1] & 0xc0) === 0x80) return true;
  return false;
}

/** True if the literal IP is loopback / private / link-local / reserved. */
export function isBlockedIp(ip: string): boolean {
  const family = net.isIP(ip);
  if (family === 4) return isBlockedV4(ip);
  if (family === 6) return isBlockedV6(ip);
  return true; // not a valid IP → refuse
}

// ————————————————————— orchestration —————————————————————

/**
 * Validate a single URL: scheme, port, hostname, and every resolved IP. Returns
 * the parsed URL when safe; throws GuardError otherwise. Does NOT follow
 * redirects — use {@link guardRedirectChain} for that.
 */
export async function guardUrl(
  input: string,
  opts: { resolver?: Resolver } = {},
): Promise<URL> {
  const u = new URL(normalizeUrl(input));

  if (!ALLOWED_SCHEMES.has(u.protocol)) {
    throw new GuardError("BLOCKED_ADDRESS", `scheme ${u.protocol}`);
  }
  if (!u.hostname) throw new GuardError("INVALID_URL", "no host");
  if (!ALLOWED_PORTS.has(u.port)) {
    throw new GuardError("BLOCKED_ADDRESS", `port ${u.port || "?"}`);
  }
  // URL keeps IPv6 hosts bracketed ("[::1]") — strip for IP detection.
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (isBlockedHostname(host)) {
    throw new GuardError("BLOCKED_ADDRESS", `host ${host}`);
  }

  let ips: string[];
  if (net.isIP(host)) {
    ips = [host];
  } else {
    try {
      ips = await (opts.resolver ?? defaultResolver)(host);
    } catch {
      throw new GuardError("DNS_FAILED", host);
    }
    if (ips.length === 0) throw new GuardError("DNS_FAILED", host);
  }
  for (const ip of ips) {
    if (isBlockedIp(ip)) throw new GuardError("BLOCKED_ADDRESS", ip);
  }
  return u;
}

export interface RedirectResult {
  finalUrl: string;
  status: number;
  hops: number;
}

/**
 * Follow up to `maxHops` redirects, re-guarding EACH hop. This is the rule that
 * naive implementations miss: a whitelisted public host can 302 to
 * 169.254.169.254. Uses a HEAD-then-GET-less manual-redirect fetch (body is
 * never read here). fetch is injectable for tests.
 */
export async function guardRedirectChain(
  input: string,
  opts: {
    resolver?: Resolver;
    fetchImpl?: typeof fetch;
    maxHops?: number;
    signal?: AbortSignal;
  } = {},
): Promise<RedirectResult> {
  const maxHops = opts.maxHops ?? 3;
  const doFetch = opts.fetchImpl ?? fetch;
  let current = normalizeUrl(input);

  for (let hop = 0; hop <= maxHops; hop++) {
    const u = await guardUrl(current, { resolver: opts.resolver });
    const res = await doFetch(u.toString(), {
      method: "GET",
      redirect: "manual",
      signal: opts.signal,
      headers: { "user-agent": AUDIT_USER_AGENT },
    });
    // Release the body without downloading it.
    try {
      await res.body?.cancel();
    } catch {
      /* ignore */
    }
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      if (hop === maxHops) {
        throw new GuardError("BLOCKED_ADDRESS", "too many redirects");
      }
      current = new URL(location, u).toString();
      continue;
    }
    return { finalUrl: u.toString(), status: res.status, hops: hop };
  }
  // Unreachable, but keeps TypeScript's control-flow happy.
  throw new GuardError("BLOCKED_ADDRESS", "too many redirects");
}

/** Honest UA with a contact, reused by the redirect probe and the radar. */
export const AUDIT_USER_AGENT =
  "SkylineAuditBot/1.0 (+https://skyline-digital.uz/audit)";

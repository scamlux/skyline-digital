/**
 * Minimal robots.txt fetch + evaluation. We respect Disallow for our UA group
 * (falling back to `*`) and honour Crawl-delay. Fail-open on fetch error only
 * for reachability (a missing robots.txt means "allowed"), never on an explicit
 * Disallow.
 */

export interface RobotsRules {
  /** No applicable Disallow rules → everything allowed. */
  allowAll: boolean;
  /** Path prefixes disallowed for our group. */
  disallow: string[];
  crawlDelaySec: number | null;
  /** True when the group disallows the whole site ("Disallow: /"). */
  blocksEverything: boolean;
}

export function parseRobots(txt: string, ua = "*"): RobotsRules {
  const lines = txt.split(/\r?\n/).map((l) => l.replace(/#.*$/, "").trim());
  // Collect rule groups keyed by their user-agent tokens.
  const groups: { agents: string[]; disallow: string[]; crawl: number | null }[] = [];
  let current: { agents: string[]; disallow: string[]; crawl: number | null } | null = null;
  let lastWasAgent = false;
  for (const line of lines) {
    if (!line) continue;
    const [rawKey, ...rest] = line.split(":");
    const key = rawKey.toLowerCase().trim();
    const value = rest.join(":").trim();
    if (key === "user-agent") {
      if (!lastWasAgent || !current) {
        current = { agents: [], disallow: [], crawl: null };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if (current) {
      if (key === "disallow" && value) current.disallow.push(value);
      if (key === "crawl-delay") current.crawl = Number(value) || null;
      lastWasAgent = false;
    }
  }
  const uaLower = ua.toLowerCase();
  const match =
    groups.find((g) => g.agents.some((a) => a !== "*" && uaLower.includes(a))) ??
    groups.find((g) => g.agents.includes("*"));
  if (!match) return { allowAll: true, disallow: [], crawlDelaySec: null, blocksEverything: false };
  return {
    allowAll: match.disallow.length === 0,
    disallow: match.disallow,
    crawlDelaySec: match.crawl,
    blocksEverything: match.disallow.includes("/"),
  };
}

export function isPathAllowed(rules: RobotsRules, path: string): boolean {
  if (rules.allowAll) return true;
  return !rules.disallow.some((d) => d !== "" && path.startsWith(d));
}

export async function fetchRobots(
  origin: string,
  ua = "*",
  fetchImpl: typeof fetch = fetch,
): Promise<RobotsRules> {
  try {
    const res = await fetchImpl(new URL("/robots.txt", origin).toString(), {
      headers: { "user-agent": ua },
    });
    if (!res.ok) return { allowAll: true, disallow: [], crawlDelaySec: null, blocksEverything: false };
    return parseRobots(await res.text(), ua);
  } catch {
    return { allowAll: true, disallow: [], crawlDelaySec: null, blocksEverything: false };
  }
}

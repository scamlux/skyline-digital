import { describe, it, expect } from "vitest";
import { parseRobots, isPathAllowed } from "./robots";

describe("parseRobots", () => {
  it("picks the * group and reads Disallow + Crawl-delay", () => {
    const r = parseRobots(
      "User-agent: *\nDisallow: /admin/\nDisallow: /private/\nCrawl-delay: 10",
    );
    expect(r.allowAll).toBe(false);
    expect(r.disallow).toEqual(["/admin/", "/private/"]);
    expect(r.crawlDelaySec).toBe(10);
    expect(r.blocksEverything).toBe(false);
  });

  it("detects a full-site block", () => {
    const r = parseRobots("User-agent: *\nDisallow: /");
    expect(r.blocksEverything).toBe(true);
  });

  it("prefers a UA-specific group when our UA matches", () => {
    const txt = "User-agent: AhrefsBot\nDisallow: /\n\nUser-agent: *\nDisallow: /admin/";
    expect(parseRobots(txt, "AhrefsBot").blocksEverything).toBe(true);
    expect(parseRobots(txt, "SkylineRadar").blocksEverything).toBe(false);
    expect(parseRobots(txt, "SkylineRadar").disallow).toEqual(["/admin/"]);
  });

  it("no robots rules → allow all", () => {
    const r = parseRobots("");
    expect(r.allowAll).toBe(true);
    expect(isPathAllowed(r, "/anything")).toBe(true);
  });

  it("isPathAllowed respects disallow prefixes", () => {
    const r = parseRobots("User-agent: *\nDisallow: /admin/");
    expect(isPathAllowed(r, "/admin/users")).toBe(false);
    expect(isPathAllowed(r, "/catalog")).toBe(true);
  });
});

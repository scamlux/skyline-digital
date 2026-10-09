import { describe, it, expect } from "vitest";
import { parseWorldbank } from "./worldbank";
import { parseReddit } from "./reddit";
import { parseTelegramChannel } from "./telegram";
import { parseFeed } from "./rss";
import { parseFreelancehunt } from "./freelancehunt";
import { htmlToText, parseBudget, toIso } from "./util";

describe("util", () => {
  it("htmlToText strips tags, keeps line breaks, decodes entities", () => {
    expect(htmlToText("<p>Нужен <b>сайт</b> &amp; бот<br/>до&nbsp;пятницы</p>")).toBe("Нужен сайт & бот\nдо пятницы");
    expect(htmlToText("<![CDATA[<i>x</i>]]>")).toBe("x");
  });

  it("toIso handles epoch seconds, ISO and garbage", () => {
    expect(toIso(1_760_000_000)).toBe(new Date(1_760_000_000_000).toISOString());
    expect(toIso("2026-10-22T08:00:00Z")).toBe("2026-10-22T08:00:00.000Z");
    expect(toIso("not a date")).toBeNull();
    expect(toIso("")).toBeNull();
  });

  it.each([
    ["Budget: $1,500", { min: 1500, max: 1500, currency: "USD" }],
    ["бюджет 50-80 тыс руб", { min: 50_000, max: 80_000, currency: "RUB" }],
    ["€2k for the MVP", { min: 2000, max: 2000, currency: "EUR" }],
    ["5 000 000 сум", { min: 5_000_000, max: 5_000_000, currency: "UZS" }],
    ["$800 – $1200 fixed", { min: 800, max: 1200, currency: "USD" }],
  ])("parseBudget(%s)", (text, want) => {
    expect(parseBudget(text)).toEqual(want);
  });

  it("parseBudget refuses numbers without currency", () => {
    expect(parseBudget("Нужно 5 страниц и 3 языка")).toBeNull();
  });
});

describe("parseWorldbank", () => {
  const payload = {
    total: 3,
    procnotices: [
      {
        id: "OP00461777",
        notice_type: "Request for Expression of Interest",
        notice_title: "Full-Stack Developer / UX/UI Designer (Mobile + Web)",
        project_name: "Uzbekistan Social Protection",
        project_ctry_name: "Uzbekistan",
        noticedate: "2026-08-18T00:00:00Z",
        submission_deadline_date: "2026-08-28T00:00:00Z",
        procurement_method_name: "Individual Consultant Selection",
      },
      { id: "OP1", notice_title: "Road works", project_ctry_name: "Kenya" },
      { notice_title: "no id", project_ctry_name: "Uzbekistan" },
    ],
  };

  it("keeps the country's notices with a detail URL and dates", () => {
    const r = parseWorldbank(payload, "Uzbekistan");
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({
      source: "worldbank",
      externalId: "OP00461777",
      url: "https://projects.worldbank.org/en/projects-operations/procurement-detail/OP00461777",
      title: "Full-Stack Developer / UX/UI Designer (Mobile + Web)",
      country: "Uzbekistan",
      deadline: "2026-08-28T00:00:00.000Z",
    });
    expect(r[0].description).toContain("Individual Consultant Selection");
  });

  it("accepts the object-keyed variant and empty payloads", () => {
    expect(parseWorldbank({ procnotices: { a: payload.procnotices[0] } }, "Uzbekistan")).toHaveLength(1);
    expect(parseWorldbank({}, "Uzbekistan")).toEqual([]);
    expect(parseWorldbank(null, "Uzbekistan")).toEqual([]);
  });
});

describe("parseReddit", () => {
  const payload = {
    data: {
      children: [
        { data: { id: "a1", title: "[Hiring] Next.js dev for SaaS dashboard, $2,000", selftext: "Supabase &amp; Stripe", permalink: "/r/forhire/comments/a1/x/", created_utc: 1_760_000_000, subreddit: "forhire" } },
        { data: { id: "a2", title: "[For Hire] Full-stack dev available", selftext: "" } },
        { data: { id: "a3", title: "Need a landing page", link_flair_text: "Hiring", selftext: "" } },
      ],
    },
  };

  it("keeps only client posts and parses the budget", () => {
    const r = parseReddit(payload);
    expect(r.map((x) => x.externalId)).toEqual(["a1", "a3"]);
    expect(r[0]).toMatchObject({
      url: "https://www.reddit.com/r/forhire/comments/a1/x/",
      description: "Supabase & Stripe",
      budgetMax: 2000,
      currency: "USD",
      tags: ["r/forhire"],
    });
  });
});

describe("parseTelegramChannel", () => {
  const html = `
<div class="tgme_widget_message_wrap"><div class="tgme_widget_message text_not_supported_wrap js-widget_message" data-post="UstozShogird/38170">
  <div class="tgme_widget_message_text js-message_text" dir="auto">Sayt kerak!<br/>Internet do'kon, Payme ulash. Byudjet 6 000 000 so'm<br/>Aloqa: @client_uz</div>
  <a class="tgme_widget_message_date" href="https://t.me/UstozShogird/38170"><time datetime="2026-10-08T09:15:00+00:00" class="time">14:15</time></a>
</div></div>
<div class="tgme_widget_message_wrap"><div class="tgme_widget_message js-widget_message" data-post="UstozShogird/38171">
  <div class="tgme_widget_message_text js-message_text" dir="auto">ok</div>
</div></div>`;

  it("parses posts with id, link, date and budget; skips tiny ones", () => {
    const r = parseTelegramChannel(html, "UstozShogird");
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({
      source: "telegram",
      externalId: "UstozShogird/38170",
      url: "https://t.me/UstozShogird/38170",
      title: "Sayt kerak!",
      publishedAt: "2026-10-08T09:15:00.000Z",
      currency: "UZS",
      budgetMax: 6_000_000,
      tags: ["@UstozShogird"],
    });
    expect(r[0].description).toContain("@client_uz");
  });
});

describe("parseFeed", () => {
  it("parses RSS 2.0 items", () => {
    const xml = `<rss><channel><item><title><![CDATA[Сайт для клиники]]></title><link>https://www.fl.ru/projects/1/</link>
      <description><![CDATA[<p>Бюджет 60 000 руб</p>]]></description><guid>https://www.fl.ru/projects/1/</guid>
      <pubDate>Wed, 08 Oct 2026 10:00:00 +0500</pubDate></item></channel></rss>`;
    const r = parseFeed(xml, "https://www.fl.ru/rss/all.xml");
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({
      source: "rss",
      title: "Сайт для клиники",
      url: "https://www.fl.ru/projects/1/",
      description: "Бюджет 60 000 руб",
      currency: "RUB",
      publishedAt: "2026-10-08T05:00:00.000Z",
      tags: ["fl.ru"],
    });
    expect(r[0].externalId).toMatch(/^fl\.ru:[0-9a-f]{16}$/);
  });

  it("parses Atom entries", () => {
    const xml = `<feed><entry><title>Website redesign RFP</title><link href="https://example.org/rfp/7"/>
      <id>tag:example.org,2026:7</id><updated>2026-10-01T00:00:00Z</updated><summary>Nonprofit site</summary></entry></feed>`;
    const r = parseFeed(xml, "https://example.org/feed");
    expect(r[0]).toMatchObject({ title: "Website redesign RFP", url: "https://example.org/rfp/7", description: "Nonprofit site" });
  });
});

describe("parseFreelancehunt", () => {
  it("maps JSON:API projects", () => {
    const r = parseFreelancehunt({
      data: [
        {
          id: 123,
          attributes: {
            name: "Telegram-бот для записи",
            description_html: "<p>Нужен бот</p>",
            budget: { amount: 300, currency: "USD" },
            published_at: "2026-10-08T07:00:00+03:00",
            expired_at: "2026-10-15T07:00:00+03:00",
            skills: [{ name: "Node.js" }],
            employer: { login: "acme" },
          },
          links: { self: { web: "https://freelancehunt.com/project/x/123.html" } },
        },
        { id: 5, attributes: {} },
      ],
    });
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({
      externalId: "123",
      url: "https://freelancehunt.com/project/x/123.html",
      description: "Нужен бот",
      budgetMax: 300,
      currency: "USD",
      buyer: "acme",
      tags: ["Node.js"],
    });
  });
});

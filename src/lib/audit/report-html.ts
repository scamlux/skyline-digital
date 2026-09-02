/**
 * Builds a self-contained, printable HTML audit report for download — no server,
 * no email needed. Everything (styles, the mobile screenshot as a data URL) is
 * inlined, so the file opens offline and the visitor can Ctrl/⌘+P → Save as PDF.
 *
 * Pure and client-safe: it takes already-translated strings, so it carries no
 * i18n dependency of its own.
 */
export interface AuditReportData {
  host: string;
  url: string;
  date: string;
  total: number;
  grade: string;
  scoreLabel: string;
  categories: { label: string; score: number }[];
  problemsLabel: string;
  noProblemsLabel: string;
  findings: { title: string; severity: string; severityLabel: string; detail: string }[];
  screenshot?: string;
  mobileLabel: string;
  tagline: string;
  savePdfLabel: string;
  contactLine: string;
}

const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;",
  );

const sevColor = (sev: string): string =>
  sev === "critical" ? "#C8392B" : sev === "major" ? "#E07B1A" : "#6B7480";

export function buildAuditReportHtml(d: AuditReportData): string {
  const cats = d.categories
    .map(
      (c) => `
      <div class="cat">
        <div class="cat-label">${esc(c.label)}</div>
        <div class="cat-score">${c.score}</div>
      </div>`,
    )
    .join("");

  const findings = d.findings.length
    ? d.findings
        .map(
          (f) => `
      <li class="finding">
        <div class="finding-head">
          <span class="finding-title">${esc(f.title)}</span>
          <span class="sev" style="color:${sevColor(f.severity)}">${esc(f.severityLabel)}</span>
        </div>
        <p class="finding-detail">${esc(f.detail)}</p>
      </li>`,
        )
        .join("")
    : `<li class="finding ok">${esc(d.noProblemsLabel)}</li>`;

  const shot = d.screenshot
    ? `<div class="shot-wrap">
         <div class="shot-label">${esc(d.mobileLabel)}</div>
         <img class="shot" src="${d.screenshot}" alt="${esc(d.mobileLabel)}" />
       </div>`
    : "";

  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Аудит — ${esc(d.host)} — Skyline Digital</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; background: #F4F6F9; color: #1A2238;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; }
  .page { max-width: 820px; margin: 0 auto; padding: 40px 28px 64px; }
  .top { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
  .brand { font-size: 20px; font-weight: 700; letter-spacing: -0.3px; }
  .brand .dot { color: #F0913A; }
  .save { border: 0; cursor: pointer; font-size: 13px; font-weight: 600; color: #1A2238;
    background: linear-gradient(90deg, #FFAE5C, #E8517C); border-radius: 999px; padding: 9px 18px; }
  .head { margin-top: 26px; }
  .eyebrow { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #F0913A; font-weight: 700; }
  h1 { margin: 8px 0 4px; font-size: 26px; }
  .url { color: #6B7480; font-size: 14px; word-break: break-all; }
  .date { color: #9AA3AE; font-size: 12px; margin-top: 2px; }
  .card { background: #fff; border: 1px solid #E3E7EC; border-radius: 16px; padding: 26px; margin-top: 22px; }
  .score-row { display: flex; align-items: center; gap: 26px; }
  .score-big { font-size: 60px; font-weight: 800; line-height: 1; }
  .grade { font-size: 30px; font-weight: 700; color: #E07B1A; }
  .score-label { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #6B7480; }
  .cats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 22px; }
  .cat { border: 1px solid #E3E7EC; border-radius: 12px; padding: 16px 10px; text-align: center; }
  .cat-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #6B7480; }
  .cat-score { font-size: 26px; font-weight: 700; margin-top: 6px; }
  h2 { font-size: 13px; letter-spacing: 2px; text-transform: uppercase; color: #F0913A; margin: 4px 0 0; }
  ul { list-style: none; margin: 14px 0 0; padding: 0; }
  .finding { border: 1px solid #E3E7EC; border-radius: 12px; padding: 16px 18px; margin-top: 12px; }
  .finding.ok { color: #178E8E; font-weight: 600; }
  .finding-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
  .finding-title { font-weight: 600; }
  .sev { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; white-space: nowrap; font-weight: 700; }
  .finding-detail { margin: 8px 0 0; font-size: 14px; line-height: 1.55; color: #4A5261; }
  .shot-wrap { margin-top: 22px; }
  .shot-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #6B7480; }
  .shot { margin-top: 10px; max-width: 320px; width: 100%; border: 1px solid #E3E7EC; border-radius: 12px; }
  footer { margin-top: 30px; border-top: 1px solid #E3E7EC; padding-top: 18px; color: #6B7480; font-size: 13px; }
  footer .tag { color: #1A2238; font-weight: 600; }
  @media print {
    body { background: #fff; }
    .save { display: none; }
    .card, .finding, .cat { break-inside: avoid; }
  }
</style>
</head>
<body>
  <div class="page">
    <div class="top">
      <div class="brand">skyline<span class="dot">.</span>digital</div>
      <button class="save" onclick="window.print()">${esc(d.savePdfLabel)}</button>
    </div>
    <div class="head">
      <div class="eyebrow">Аудит сайта</div>
      <h1>${esc(d.host)}</h1>
      <div class="url">${esc(d.url)}</div>
      <div class="date">${esc(d.date)}</div>
    </div>

    <div class="card">
      <div class="score-row">
        <div>
          <div class="score-label">${esc(d.scoreLabel)}</div>
          <div class="score-big">${d.total}</div>
        </div>
        <div class="grade">${esc(d.grade)}</div>
      </div>
      <div class="cats">${cats}</div>
    </div>

    <div class="card">
      <h2>${esc(d.problemsLabel)}</h2>
      <ul>${findings}</ul>
      ${shot}
    </div>

    <footer>
      <div class="tag">${esc(d.tagline)}</div>
      <div style="margin-top:6px">${esc(d.contactLine)}</div>
    </footer>
  </div>
</body>
</html>`;
}

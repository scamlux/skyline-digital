import type { AuditApiResult, Finding, ScoreCategory } from "./types";
import type { AuditReportData } from "./report-html";
import { buildToolSections } from "./tool-sections";

/**
 * One mapping from an audit result to the printable report — used by the
 * client "download HTML" button and the server PDF route, so both render the
 * same content. `t` is scoped to the `audit` namespace.
 */

type T = (key: string, values?: Record<string, string | number>) => string;

const CATEGORY_ORDER: ScoreCategory[] = ["speed", "conversion", "mobile", "seo", "security"];

export function reportData(
  result: AuditApiResult,
  t: T,
  opts: { locale: string; date: string; contactLine: string; forPdf?: boolean },
): AuditReportData {
  const score = result.score!;
  const finding = (f: Finding, key: "titleKey" | "detailKey") => t(f[key].replace(/^audit\./, ""), f.values ?? {});
  const sections = buildToolSections(result.tools, t);
  if (result.benchmark) {
    sections.unshift({
      id: "presence",
      title: t("result.scoreLabel"),
      rows: [{ label: "", value: t("tools.benchmark", { pct: result.benchmark.betterThanPct, industry: result.benchmark.industry, n: result.benchmark.n }) }],
    });
  }
  return {
    host: result.host,
    url: result.finalUrl,
    date: opts.date,
    total: score.total,
    grade: score.grade,
    scoreLabel: t("result.scoreLabel"),
    categories: CATEGORY_ORDER.filter((c) => score.categories[c] != null).map((c) => ({
      label: t(`categories.${c}`),
      score: score.categories[c]?.score ?? 0,
    })),
    problemsLabel: t("result.topProblems"),
    noProblemsLabel: t("result.noProblems"),
    findings: score.findings.map((f) => ({
      title: finding(f, "titleKey"),
      severity: f.severity,
      severityLabel: t(`severity.${f.severity}`),
      detail: finding(f, "detailKey"),
    })),
    screenshot: result.screenshot ?? undefined,
    mobileLabel: t("result.mobileView"),
    tagline: t("report.downloadTagline"),
    savePdfLabel: t("report.savePdf"),
    contactLine: opts.contactLine,
    sections: sections.map((s) => ({ title: s.title, rows: s.rows })),
    forPdf: opts.forPdf,
    lang: opts.locale,
  };
}

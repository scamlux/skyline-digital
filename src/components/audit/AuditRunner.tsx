"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { TurnstileWidget, turnstileEnabled, resetTurnstile } from "@/components/security/TurnstileWidget";
import { buildAuditReportHtml } from "@/lib/audit/report-html";
import { CONTACTS } from "@/lib/contact";
import { PhoneInputUz } from "@/components/ui/PhoneInputUz";
import type { AuditApiResult, Finding, ScoreCategory } from "@/lib/audit/types";

type Phase = "idle" | "measuring" | "done";
type ReportPhase = "idle" | "sending";

const CATEGORIES: ScoreCategory[] = ["speed", "mobile", "security", "seo"];
const PROGRESS_KEYS = ["progress.loadingPage", "progress.measuringSpeed", "progress.checkingMobile"] as const;

export function AuditRunner() {
  const t = useTranslations("audit");
  const locale = useLocale();

  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<AuditApiResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cycle the progress steps while measuring (10–20s of real work).
  useEffect(() => {
    if (phase !== "measuring") return;
    const id = setInterval(() => setStep((s) => Math.min(s + 1, PROGRESS_KEYS.length - 1)), 5000);
    return () => clearInterval(id);
  }, [phase]);

  const run = useCallback(async () => {
    if (!url.trim() || phase === "measuring") return;
    setStep(0);
    setPhase("measuring");
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (res.status === 429) {
        setError(t("tooManyRequests"));
        setPhase("idle");
        return;
      }
      const data = (await res.json()) as AuditApiResult;
      setResult(data);
      setPhase("done");
    } catch {
      setError(t("report.errorGeneric"));
      setPhase("idle");
    }
  }, [url, phase, t]);

  const finding = (f: Finding, key: "title" | "detail") =>
    t(f[key === "title" ? "titleKey" : "detailKey"].replace(/^audit\./, ""), f.values ?? {});

  return (
    <div>
      {/* ——— Form (day sky) ——— */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <input
          type="text"
          inputMode="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={t("urlPlaceholder")}
          className="flex-1 rounded-full border border-line bg-day px-6 py-4 text-ink outline-none transition-colors focus-visible:border-apricot"
          aria-label={t("urlPlaceholder")}
        />
        <button
          type="submit"
          disabled={phase === "measuring" || !url.trim()}
          className="horizon-gradient rounded-full px-8 py-4 font-medium text-night transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {t("checkButton")}
        </button>
      </form>

      {error && (
        <p className="mt-4 text-sm text-afterglow" role="alert">
          {error}
        </p>
      )}

      {/* ——— Progress ——— */}
      {phase === "measuring" && (
        <div className="mt-10 rounded-2xl border border-line-night bg-night p-8 text-day">
          <SunProgressLite step={step} labels={PROGRESS_KEYS.map((k) => t(k))} />
          <p className="mt-6 text-center font-mono text-sm text-mist">
            {t(PROGRESS_KEYS[step])}
          </p>
        </div>
      )}

      {/* ——— Result ——— */}
      {phase === "done" && result && (
        <div className="mt-10">
          {!result.reachable || !result.score ? (
            <div className="rounded-2xl border border-line-night bg-night p-8 text-center text-day">
              <p className="font-display text-2xl">{t("result.unreachable")}</p>
              <p className="mt-3 text-mist">{t(`errors.${result.error ?? "HTTP_ERROR"}`)}</p>
            </div>
          ) : (
            <ResultView
              result={result}
              finding={finding}
              t={t}
              locale={locale}
              onReport={setResult}
            />
          )}
        </div>
      )}
    </div>
  );
}

/** Score + categories + findings + report block (night sky). */
function ResultView({
  result,
  finding,
  t,
  locale,
  onReport,
}: {
  result: AuditApiResult;
  finding: (f: Finding, key: "title" | "detail") => string;
  t: ReturnType<typeof useTranslations>;
  locale: string;
  onReport: (r: AuditApiResult) => void;
}) {
  const score = result.score!;

  const downloadReport = () => {
    const html = buildAuditReportHtml({
      host: result.host,
      url: result.finalUrl,
      date: new Date().toLocaleDateString(
        locale === "uz" ? "uz-UZ" : locale === "en" ? "en-US" : "ru-RU",
      ),
      total: score.total,
      grade: score.grade,
      scoreLabel: t("result.scoreLabel"),
      categories: CATEGORIES.map((c) => ({
        label: t(`categories.${c}`),
        score: score.categories[c].score,
      })),
      problemsLabel: t("result.topProblems"),
      noProblemsLabel: t("result.noProblems"),
      findings: score.findings.map((f) => ({
        title: finding(f, "title"),
        severity: f.severity,
        severityLabel: t(`severity.${f.severity}`),
        detail: finding(f, "detail"),
      })),
      screenshot: result.screenshot ?? undefined,
      mobileLabel: t("result.mobileView"),
      tagline: t("report.downloadTagline"),
      savePdfLabel: t("report.savePdf"),
      contactLine: `Skyline Digital · skyline-digital.uz · ${CONTACTS.phoneDisplay} · ${CONTACTS.email}`,
    });
    const href = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = href;
    a.download = `skyline-audit-${result.host.replace(/[^a-z0-9.-]/gi, "_")}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(href);
  };

  return (
    <div className="rounded-2xl border border-line-night bg-night p-8 text-day">
      {/* Big score with the sun */}
      <div className="flex flex-col items-center gap-4 border-b border-line-night pb-8">
        <ScoreSun total={score.total} grade={score.grade} label={t("result.scoreLabel")} />
      </div>

      {/* Categories */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {CATEGORIES.map((cat) => (
          <div key={cat} className="rounded-xl border border-line-night bg-night-deep p-5 text-center">
            <p className="font-mono text-xs uppercase tracking-wide text-mist">{t(`categories.${cat}`)}</p>
            <p className="font-display mt-2 text-2xl">{score.categories[cat].score}</p>
          </div>
        ))}
      </div>

      {/* Findings — top 3 (fast) or all (report) */}
      <h3 className="mt-10 font-mono text-xs uppercase tracking-[0.2em] text-apricot">
        {t("result.topProblems")}
      </h3>
      <ul className="mt-4 space-y-4">
        {score.findings.map((f) => (
          <li key={f.id} className="rounded-xl border border-line-night bg-night-deep p-5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-medium text-day">{finding(f, "title")}</span>
              <span
                className={cn(
                  "shrink-0 font-mono text-xs uppercase",
                  f.severity === "critical" ? "text-afterglow" : f.severity === "major" ? "text-apricot" : "text-mist",
                )}
              >
                {t(`severity.${f.severity}`)}
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-mist">{finding(f, "detail")}</p>
          </li>
        ))}
      </ul>

      {/* Report screenshot (report only) */}
      {result.screenshot && (
        <div className="mt-8">
          <p className="font-mono text-xs uppercase tracking-wide text-mist">{t("result.mobileView")}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={result.screenshot}
            alt={t("result.mobileView")}
            className="mt-3 max-h-[520px] w-auto rounded-xl border border-line-night"
          />
        </div>
      )}

      {/* Report form OR calculator CTA */}
      {result.screenshot ? (
        <div className="mt-10 border-t border-line-night pt-8 text-center">
          <p className="text-mist">{t("report.sent")}</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={downloadReport}
              className="rounded-full border border-line-night px-7 py-3.5 font-medium text-day transition-colors hover:border-apricot"
            >
              {t("report.download")}
            </button>
            <Link
              href="/calculator"
              className="horizon-gradient inline-block rounded-full px-7 py-3.5 font-medium text-night transition-opacity hover:opacity-90"
            >
              {t("report.calculatorCta")}
            </Link>
          </div>
        </div>
      ) : (
        <ReportForm url={result.finalUrl} t={t} locale={locale} onReport={onReport} />
      )}
    </div>
  );
}

/** E-mail + Turnstile → full report. */
function ReportForm({
  url,
  t,
  locale,
  onReport,
}: {
  url: string;
  t: ReturnType<typeof useTranslations>;
  locale: string;
  onReport: (r: AuditApiResult) => void;
}) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [hp, setHp] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [phase, setPhase] = useState<ReportPhase>("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phase === "sending") return;
    if (!phone) {
      setError(t("report.phoneRequired"));
      return;
    }
    if (turnstileEnabled && !captchaToken) {
      setError(t("report.captchaRequired"));
      return;
    }
    setPhase("sending");
    setError(null);
    try {
      const res = await fetch("/api/audit/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, email, phone, name, hp, turnstileToken: captchaToken, landing_page: url }),
      });
      if (res.status === 429) {
        setError(t("tooManyRequests"));
        setPhase("idle");
        resetTurnstile();
        return;
      }
      if (!res.ok) {
        setError(t("report.errorGeneric"));
        setPhase("idle");
        resetTurnstile();
        return;
      }
      // The report endpoint returns the enriched result (all findings +
      // screenshot). Hand it up so the parent re-renders the full report.
      const enriched = (await res.json()) as AuditApiResult;
      onReport(enriched);
    } catch {
      setError(t("report.errorGeneric"));
      setPhase("idle");
      resetTurnstile();
    }
  };

  return (
    <form onSubmit={submit} className="mt-10 border-t border-line-night pt-8">
      <h3 className="font-display text-xl">{t("report.heading")}</h3>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("report.emailPlaceholder")}
          className="rounded-full border border-line-night bg-night-deep px-5 py-3 text-day outline-none transition-colors focus-visible:border-apricot"
        />
        <PhoneInputUz
          value={phone}
          onChange={setPhone}
          className="rounded-full border border-line-night bg-night-deep px-5 py-3 font-mono text-day outline-none transition-colors focus-visible:border-apricot"
        />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("report.namePlaceholder")}
          maxLength={120}
          className="rounded-full border border-line-night bg-night-deep px-5 py-3 text-day outline-none transition-colors focus-visible:border-apricot sm:col-span-2"
        />
      </div>
      {/* Honeypot — must stay empty. */}
      <input
        type="text"
        name="hp"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={hp}
        onChange={(e) => setHp(e.target.value)}
        className="pointer-events-none absolute h-0 w-0 opacity-0"
      />
      <TurnstileWidget onToken={setCaptchaToken} language={locale} className="mt-4" />
      {error && (
        <p className="mt-3 text-sm text-afterglow" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={phase === "sending"}
        className="horizon-gradient mt-5 rounded-full px-7 py-3.5 font-medium text-night transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {t("report.submit")}
      </button>
    </form>
  );
}

/** The sun rising to the score: fill height encodes 0–100. */
function ScoreSun({ total, grade, label }: { total: number; grade: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-mist">{label}</p>
      <div className="relative mt-4 flex h-32 w-32 items-center justify-center">
        <div
          className="sun-disc sun-aurora absolute inset-0 rounded-full transition-all duration-700"
          style={{ opacity: 0.25 + (total / 100) * 0.75, transform: `scale(${0.7 + (total / 100) * 0.3})` }}
          aria-hidden
        />
        <span className="font-display relative text-5xl text-night">{total}</span>
      </div>
      <span className="font-display mt-4 text-3xl text-day">{grade}</span>
    </div>
  );
}

/** Thin wrapper over the horizon metaphor for the 3-step progress. */
function SunProgressLite({ step, labels }: { step: number; labels: string[] }) {
  const pct = labels.length <= 1 ? 100 : (step / (labels.length - 1)) * 100;
  return (
    <div aria-hidden className="relative h-8 select-none">
      <div className="absolute inset-x-0 top-1/2 h-px bg-line-night" />
      <div className="horizon-gradient absolute top-1/2 h-px transition-all duration-500" style={{ width: `${pct}%` }} />
      <div
        className="sun-disc absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full transition-all duration-500"
        style={{ left: `calc(${pct}% - 10px)` }}
      />
    </div>
  );
}

"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Finding } from "@/lib/audit/types";
import type { SharedReport } from "@/lib/audit/store";
import { ResultView } from "./AuditRunner";

/**
 * The stored report behind /audit/r/<token>: same view as the live result,
 * plus when it was measured and how the score moved since earlier checks
 * (only checks scored by the same rules version are compared).
 */
export function SharedAuditReport({ report }: { report: SharedReport }) {
  const t = useTranslations("audit");
  const locale = useLocale();
  const intl = locale === "uz" ? "uz-UZ" : locale === "en" ? "en-US" : "ru-RU";
  const date = (iso: string) => new Date(iso).toLocaleDateString(intl, { day: "numeric", month: "long", year: "numeric" });
  const finding = (f: Finding, key: "title" | "detail") =>
    t(f[key === "title" ? "titleKey" : "detailKey"].replace(/^audit\./, ""), f.values ?? {});
  const { result, history, createdAt } = report;

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-wide text-muted">
        {t("report.measuredAt")}: {date(createdAt)}
      </p>

      {history.length > 0 && result.score && (
        <div className="mt-4 rounded-xl border border-line bg-surface p-5">
          <p className="font-mono text-xs uppercase tracking-wide text-muted">{t("report.history")}</p>
          <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink">
            {history.map((h) => {
              const delta = result.score!.total - h.total;
              return (
                <li key={h.createdAt}>
                  {date(h.createdAt)} · {h.grade} {h.total}
                  {delta !== 0 && (
                    <span className={delta > 0 ? "ml-2 font-medium text-ink" : "ml-2 text-afterglow"}>
                      {delta > 0 ? `▲ ${delta}` : `▼ ${-delta}`}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="mt-6">
        {result.reachable && result.score ? (
          <ResultView result={result} finding={finding} t={t} locale={locale} shared />
        ) : (
          <div className="rounded-2xl border border-line-night bg-night p-8 text-center text-day">
            <p className="font-display text-2xl">{t("result.unreachable")}</p>
            <p className="mt-3 text-mist">{t(`errors.${result.error ?? "HTTP_ERROR"}`)}</p>
          </div>
        )}
      </div>

      <div className="mt-8 text-center">
        <Link href="/audit" className="font-mono text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
          {t("report.shareRerun")} →
        </Link>
      </div>
    </div>
  );
}

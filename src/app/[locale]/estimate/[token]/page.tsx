import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import type { PricingResult } from "@/lib/pricing/types";
import { ROLE_LABELS } from "@/lib/pricing/roles";
import type { Proposal } from "@/lib/ai/schema";
import { formatUsd } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "estimate" });
  return { title: t("eyebrow"), robots: { index: false } };
}

async function fetchEstimate(token: string) {
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("estimates")
    .select("ai_result, pricing_result, created_at")
    .eq("token", token)
    .single();
  if (!data) return null;
  return {
    proposal: data.ai_result as Proposal,
    pricing: data.pricing_result as PricingResult,
  };
}

export default async function EstimatePage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("estimate");
  const tr = await getTranslations("calc.result");

  const estimate = await fetchEstimate(token);

  if (!estimate) {
    return (
      <main className="bg-night text-day">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-5 px-5 py-24 md:px-8 md:py-32">
          <h1 className="font-display text-3xl font-medium">{t("notFoundTitle")}</h1>
          <p className="text-mist">{t("notFoundText")}</p>
          <Link
            href="/calculator"
            className="horizon-gradient rounded-full px-7 py-3.5 text-sm font-medium text-night"
          >
            {t("notFoundCta")}
          </Link>
        </div>
      </main>
    );
  }

  const { proposal, pricing } = estimate;

  return (
    <main>
      {/* Night header band with the key numbers */}
      <section className="relative overflow-hidden bg-night text-day">
        <div className="mx-auto max-w-6xl px-5 pb-20 pt-12 md:px-8 md:pb-28 md:pt-20">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-apricot">
            {t("eyebrow")}
          </p>
          <h1 className="font-display mt-4 max-w-3xl text-3xl font-medium md:text-5xl">
            {proposal.projectTitle}
          </h1>
          <div className="mt-10 grid max-w-2xl gap-6 sm:grid-cols-2">
            <div>
              <p className="font-mono text-xs uppercase tracking-wide text-mist">
                {tr("investment")}
              </p>
              <p className="font-display mt-2 text-2xl md:text-3xl">
                {formatUsd(pricing.totalMin)} – {formatUsd(pricing.totalMax)}
              </p>
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-wide text-mist">
                {tr("timeline")}
              </p>
              <p className="font-display mt-2 text-2xl md:text-3xl">
                {pricing.estimatedWeeks} {tr("weeksShort")}
              </p>
            </div>
          </div>
        </div>
        <div
          className="sun-disc pointer-events-none absolute -bottom-16 right-10 h-36 w-36 opacity-70 md:h-52 md:w-52"
          aria-hidden
        />
        <div className="horizon-gradient absolute bottom-0 h-px w-full opacity-80" aria-hidden />
      </section>

      {/* Day body with the proposal content */}
      <div className="bg-day">
        <div className="mx-auto max-w-3xl px-5 py-14 md:px-8 md:py-20">
          <Block title={tr("summary")}>
            <p className="leading-relaxed">{proposal.summary}</p>
          </Block>
          <Breakdown pricing={pricing} tr={tr} />
          <Block title={tr("scope")}>
            <List items={proposal.scope} />
          </Block>
          <Block title={tr("features")}>
            <List items={proposal.features} />
          </Block>
          <Block title={tr("stack")}>
            <div className="flex flex-wrap gap-2">
              {proposal.recommendedStack.map((s) => (
                <span
                  key={s}
                  className="rounded-full border border-line px-3 py-1.5 text-xs"
                >
                  {s}
                </span>
              ))}
            </div>
          </Block>
          <Block title={tr("recommendations")}>
            <List items={proposal.recommendations} />
          </Block>
          <Block title={tr("nextSteps")}>
            <List items={proposal.nextSteps} />
          </Block>

          <div className="mt-12 flex flex-wrap items-center gap-4">
            <a
              href={`/api/proposal/${token}`}
              className="rounded-full bg-night px-7 py-3.5 text-sm font-medium text-day transition-opacity hover:opacity-90"
            >
              {tr("download")}
            </a>
            <Link
              href="/calculator"
              className="font-mono text-sm text-muted transition-colors hover:text-ink"
            >
              {tr("newCalc")} →
            </Link>
          </div>
          <p className="mt-8 text-xs leading-relaxed text-mist">{tr("disclaimer")}</p>
        </div>
      </div>
    </main>
  );
}

/** Open unit-economics breakdown. Guarded: older snapshots have no rows. */
function Breakdown({
  pricing,
  tr,
}: {
  pricing: PricingResult;
  tr: (key: string) => string;
}) {
  const rows = pricing.roleBreakdown ?? [];
  if (rows.length === 0) return null;

  return (
    <section className="border-t border-line py-8">
      <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-muted">
        {tr("breakdown")}
      </h2>
      <div className="mt-4 overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left font-mono text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-normal">{tr("colRole")}</th>
              <th className="px-4 py-3 text-right font-normal">{tr("colHours")}</th>
              <th className="px-4 py-3 text-right font-normal">{tr("colRate")}</th>
              <th className="px-4 py-3 text-right font-normal">{tr("colSum")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.role} className="border-b border-line/70">
                <td className="px-4 py-2.5">{ROLE_LABELS[row.role]}</td>
                <td className="px-4 py-2.5 text-right font-mono text-muted">{row.hours}</td>
                <td className="px-4 py-2.5 text-right font-mono text-muted">
                  {formatUsd(row.rate)}/{tr("perHour")}
                </td>
                <td className="px-4 py-2.5 text-right font-mono">{formatUsd(row.sum)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-line">
              <td className="px-4 py-2.5 font-mono text-xs uppercase tracking-wide text-muted" colSpan={3}>
                {tr("subtotal")}
              </td>
              <td className="px-4 py-2.5 text-right font-mono">{formatUsd(pricing.subtotal ?? 0)}</td>
            </tr>
            {(pricing.urgencyAmount ?? 0) > 0 && (
              <tr>
                <td className="px-4 py-2.5 font-mono text-xs uppercase tracking-wide text-muted" colSpan={3}>
                  {tr("urgencyLine")}
                </td>
                <td className="px-4 py-2.5 text-right font-mono">
                  +{formatUsd(pricing.urgencyAmount ?? 0)}
                </td>
              </tr>
            )}
            <tr className="border-t border-line">
              <td className="px-4 py-3 font-mono text-xs uppercase tracking-wide text-afterglow" colSpan={3}>
                {tr("total")}
              </td>
              <td className="px-4 py-3 text-right font-display text-lg">
                {formatUsd(pricing.total ?? 0)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      {pricing.hasCustom && (
        <p className="mt-3 text-sm text-muted">— {tr("customLine")}</p>
      )}
    </section>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line py-8 first:border-t-0 first:pt-0">
      <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-muted">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-sm leading-relaxed">
          <span className="text-afterglow">—</span>
          {item}
        </li>
      ))}
    </ul>
  );
}

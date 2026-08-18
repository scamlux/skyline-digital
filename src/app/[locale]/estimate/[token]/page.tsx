import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import type { PricingResult } from "@/lib/pricing/types";
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

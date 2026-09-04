import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { basePriceUsd, featuresByType, features as featureDefs } from "@/lib/pricing/rules";
import { roleHoursCost } from "@/lib/pricing/roles";
import { roundMoney, formatUsd } from "@/lib/utils";
import { getProjects } from "@/lib/portfolio";
import { localeUrl, languageAlternates } from "@/lib/seo";
import type { ProjectType } from "@/lib/pricing/types";
import { PreviewCard } from "@/components/projects/PreviewCard";
import { CASE_CATEGORY } from "@/lib/case-category";

export const revalidate = 300;

const SERVICE_KEYS = ["website", "webApp", "mobileApp", "ai", "automation", "uiux"] as const;
type ServiceKey = (typeof SERVICE_KEYS)[number];

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => SERVICE_KEYS.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!SERVICE_KEYS.includes(slug as ServiceKey)) return {};
  const t = await getTranslations({ locale, namespace: "services" });
  return {
    title: `${t(`items.${slug}.title`)} — Skyline Digital`,
    description: t(`items.${slug}.desc`),
    alternates: {
      canonical: localeUrl(locale, `/services/${slug}`),
      languages: languageAlternates(`/services/${slug}`),
    },
  };
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!SERVICE_KEYS.includes(slug as ServiceKey)) notFound();
  const key = slug as ServiceKey;
  setRequestLocale(locale);
  const t = await getTranslations("services");
  const tc = await getTranslations("calc");

  const price = basePriceUsd(key as ProjectType);
  const featureKeys = (featuresByType[key as ProjectType] ?? []).slice(0, 8);
  const category = CASE_CATEGORY[key];
  const cases = (await getProjects())
    .filter((p) => !category || p.category === category)
    .slice(0, 3);
  const faq = [1, 2, 3, 4].map((i) => ({ q: t(`faq.q${i}`), a: t(`faq.a${i}`) }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: t(`items.${key}.title`),
    description: t(`items.${key}.desc`),
    provider: { "@type": "Organization", name: "Skyline Digital", url: localeUrl(locale, "") },
    areaServed: "UZ",
    offers: { "@type": "Offer", priceCurrency: "USD", price, description: `${t("from")} ${formatUsd(price)}` },
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* Hero (ночное небо) */}
      <section className="relative overflow-hidden bg-night text-day">
        <div className="stars-far" aria-hidden />
        <div className="mx-auto max-w-6xl px-5 pb-16 pt-12 md:px-8 md:pb-20 md:pt-20">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-apricot">
            {t("title")}
          </p>
          <h1 className="font-display mt-4 text-3xl font-medium md:text-5xl">
            {t(`items.${key}.title`)}
          </h1>
          <p className="mt-5 max-w-2xl text-mist md:text-lg">{t(`items.${key}.desc`)}</p>
          <div className="mt-8 flex flex-wrap items-center gap-5">
            <Link
              href={`/calculator?type=${key}`}
              className="horizon-gradient rounded-full px-7 py-3.5 text-sm font-medium text-night transition-opacity hover:opacity-90"
            >
              {t("ctaButton")}
            </Link>
            <span className="font-mono text-sm text-mist">
              {t("from")} <b className="text-day">{formatUsd(price)}</b>
            </span>
          </div>
        </div>
        <div className="horizon-gradient h-px w-full opacity-80" aria-hidden />
      </section>

      <div className="bg-day">
        {/* Состав: функции из прайса с ценами «+$» */}
        <section className="mx-auto max-w-6xl px-5 py-14 md:px-8 md:py-20">
          <h2 className="font-display text-2xl font-medium md:text-3xl">{t("includedLabel")}</h2>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {t(`items.${key}.benefits`)
              .split("·")
              .map((b) => (
                <div key={b} className="rounded-xl border border-line bg-surface px-5 py-4 text-sm">
                  {b.trim()}
                </div>
              ))}
            {featureKeys.map((f) => (
              <div key={f} className="flex items-baseline justify-between gap-3 rounded-xl border border-line bg-surface px-5 py-4 text-sm">
                <span>{tc(`features.${f}`)}</span>
                <span className="shrink-0 font-mono text-xs text-muted">
                  +{formatUsd(roundMoney(roleHoursCost(featureDefs[f] ?? {})))}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Кейсы */}
        {cases.length > 0 && (
          <section className="mx-auto max-w-6xl px-5 pb-14 md:px-8 md:pb-20">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="font-display text-2xl font-medium md:text-3xl">{t("casesLabel")}</h2>
              <Link href="/projects" className="font-mono text-sm text-muted hover:text-ink">
                {t("allProjects")}
              </Link>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {cases.map((p) => (
                <Link key={p.slug} href={`/projects/${p.slug}`} className="group block">
                  <PreviewCard image={p.image} title={p.title} url={p.url} sizes="(min-width:1024px) 33vw, 50vw" />
                  <p className="mt-3 font-medium">{p.title}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-5 pb-14 md:px-8 md:pb-20">
          <h2 className="font-display text-2xl font-medium md:text-3xl">{t("faqTitle")}</h2>
          <div className="mt-6 divide-y divide-line rounded-2xl border border-line bg-surface">
            {faq.map(({ q, a }) => (
              <details key={q} className="group px-6 py-4">
                <summary className="cursor-pointer list-none font-medium marker:hidden">
                  {q}
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-muted">{a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>

      {/* CTA (ночь) */}
      <section className="bg-night text-day">
        <div className="mx-auto max-w-6xl px-5 py-16 text-center md:px-8 md:py-20">
          <h2 className="font-display text-2xl font-medium md:text-4xl">{t("ctaTitle")}</h2>
          <p className="mx-auto mt-4 max-w-xl text-mist">{t("ctaText")}</p>
          <Link
            href={`/calculator?type=${key}`}
            className="horizon-gradient mt-8 inline-block rounded-full px-8 py-4 font-medium text-night transition-opacity hover:opacity-90"
          >
            {t("ctaButton")}
          </Link>
        </div>
      </section>
    </main>
  );
}

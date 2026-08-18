import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { basePrices } from "@/lib/pricing/rules";
import { formatUsd } from "@/lib/utils";

const SERVICE_KEYS = [
  "website",
  "webApp",
  "mobileApp",
  "ai",
  "automation",
  "uiux",
] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "services" });
  return { title: t("title"), description: t("intro") };
}

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("services");

  return (
    <main>
      <section className="relative overflow-hidden bg-night text-day">
        <div className="stars-far" aria-hidden />
        <div className="mx-auto max-w-6xl px-5 pb-16 pt-12 md:px-8 md:pb-24 md:pt-20">
          <h1 className="font-display animate-fade-up text-3xl font-medium md:text-5xl">
            {t("title")}
          </h1>
          <p
            className="animate-fade-up mt-5 max-w-2xl text-mist md:text-lg"
            style={{ "--d": "150ms" } as React.CSSProperties}
          >
            {t("intro")}
          </p>
        </div>
        <div className="horizon-gradient animate-line-draw h-px w-full opacity-80" aria-hidden />
      </section>

      <div className="bg-day">
        <div className="mx-auto max-w-6xl px-5 md:px-8">
          {SERVICE_KEYS.map((key, i) => {
            // "·"-separated strings keep the message files flat.
            const benefits = t(`items.${key}.benefits`).split("·");
            const examples = t(`items.${key}.examples`).split("·");
            return (
              <Reveal key={key}>
                <article
                  className={`grid gap-6 py-12 md:grid-cols-[2fr_3fr] md:gap-12 md:py-16 ${
                    i > 0 ? "border-t border-line" : ""
                  }`}
                >
                  <div>
                    <h2 className="font-display text-xl font-medium md:text-2xl">
                      {t(`items.${key}.title`)}
                    </h2>
                    <p className="mt-2 font-mono text-sm text-muted">
                      {t("from")} {formatUsd(basePrices[key].price)}
                    </p>
                  </div>
                  <div>
                    <p className="leading-relaxed text-ink">{t(`items.${key}.desc`)}</p>
                    <div className="mt-6 grid gap-6 sm:grid-cols-2">
                      <div>
                        <h3 className="font-mono text-xs uppercase tracking-[0.15em] text-muted">
                          {t("benefitsLabel")}
                        </h3>
                        <ul className="mt-3 space-y-1.5">
                          {benefits.map((b) => (
                            <li key={b} className="flex gap-2 text-sm text-ink">
                              <span className="text-apricot">—</span>
                              {b}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h3 className="font-mono text-xs uppercase tracking-[0.15em] text-muted">
                          {t("examplesLabel")}
                        </h3>
                        <ul className="mt-3 space-y-1.5">
                          {examples.map((e) => (
                            <li key={e} className="flex gap-2 text-sm text-ink">
                              <span className="text-afterglow">—</span>
                              {e}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>

      <Section eyebrow={t("title")} tone="night">
        <div className="flex flex-col items-start gap-4">
          <h2 className="font-display max-w-xl text-2xl font-medium md:text-3xl">
            {t("cta")}
          </h2>
          <p className="font-mono text-sm text-mist">{t("ctaHint")}</p>
          <Link
            href="/calculator"
            className="horizon-gradient mt-2 rounded-full px-8 py-4 text-sm font-medium text-night transition-opacity hover:opacity-90"
          >
            {t("cta")}
          </Link>
        </div>
      </Section>
    </main>
  );
}

import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { localeUrl, languageAlternates } from "@/lib/seo";

const STACK = [
  "Next.js",
  "TypeScript",
  "React Native",
  "Tailwind CSS",
  "Supabase",
  "PostgreSQL",
  "OpenAI",
  "Node.js",
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  return {
    title: t("title"),
    description: t("intro"),
    alternates: {
      canonical: localeUrl(locale, "/about"),
      languages: languageAlternates("/about"),
    },
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");

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
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 md:grid-cols-2 md:gap-16 md:px-8 md:py-20">
          <Reveal>
            <p className="leading-relaxed text-ink md:text-lg">{t("p1")}</p>
          </Reveal>
          <Reveal delay={100}>
            <p className="leading-relaxed text-ink md:text-lg">{t("p2")}</p>
          </Reveal>
        </div>
      </div>

      <Section eyebrow={t("valuesTitle")}>
        <div className="grid gap-10 md:grid-cols-3">
          {(["v1", "v2", "v3"] as const).map((key, i) => (
            <Reveal key={key} delay={i * 80}>
              <div>
                <h2 className="font-medium md:text-lg">{t(`${key}.title`)}</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  {t(`${key}.text`)}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section eyebrow={t("stackTitle")} tone="night">
        <div className="flex flex-wrap gap-3">
          {STACK.map((tech) => (
            <span
              key={tech}
              className="rounded-full border border-line-night px-4 py-2 text-sm text-mist"
            >
              {tech}
            </span>
          ))}
        </div>
        <Link
          href="/calculator"
          className="horizon-gradient mt-10 inline-block rounded-full px-8 py-4 text-sm font-medium text-night transition-opacity hover:opacity-90"
        >
          {t("cta")}
        </Link>
      </Section>
    </main>
  );
}

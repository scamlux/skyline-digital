import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { Marquee } from "@/components/ui/Marquee";
import { Spotlight } from "@/components/ui/Spotlight";
import { PreviewCard } from "@/components/projects/PreviewCard";
import { TechStack } from "@/components/home/TechStack";
import { ProcessSteps } from "@/components/home/ProcessSteps";
import { projects } from "@/data/projects";
import { basePriceUsd } from "@/lib/pricing/rules";
import { formatUsd } from "@/lib/utils";

const SERVICE_KEYS = [
  "website",
  "webApp",
  "mobileApp",
  "ai",
  "automation",
  "uiux",
] as const;

/**
 * Split the hero headline into words for the staggered reveal. Words wrapped
 * in *asterisks* in the message string get the gradient fill.
 */
function heroWords(title: string) {
  const words: { text: string; accent: boolean }[] = [];
  let accent = false;
  for (const raw of title.split(" ")) {
    let text = raw;
    let thisAccent = accent;
    if (text.startsWith("*")) {
      thisAccent = true;
      accent = true;
      text = text.slice(1);
    }
    if (text.endsWith("*") || text.includes("*")) {
      accent = false;
      text = text.replace("*", "");
      thisAccent = true;
    }
    words.push({ text, accent: thisAccent });
  }
  return words;
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const ts = await getTranslations("services");
  const featured = projects.slice(0, 4);
  const words = heroWords(t("hero.title"));

  const marqueeItems = [
    ...SERVICE_KEYS.map((key) => ts(`items.${key}.title`)),
    "Next.js",
    "TypeScript",
    "React Native",
    "OpenAI",
    "Supabase",
  ];

  return (
    <main>
      {/* ——— Hero: night sky, staggered headline, rising sun ——— */}
      <section className="relative overflow-hidden bg-night text-day">
        <div className="stars-far" aria-hidden />
        <div className="stars" aria-hidden />
        <Spotlight>
          <div className="mx-auto flex max-w-6xl flex-col px-5 pb-44 pt-16 md:px-8 md:pb-60 md:pt-24">
            <h1 className="font-display max-w-3xl text-3xl font-medium leading-tight md:text-5xl md:leading-[1.15]">
              {words.map((w, i) => (
                <span key={i}>
                  <span
                    className={`hero-word ${w.accent ? "text-horizon" : ""}`}
                    style={{ "--d": `${120 + i * 70}ms` } as React.CSSProperties}
                  >
                    {w.text}
                  </span>{" "}
                </span>
              ))}
            </h1>
            <p
              className="animate-fade-up mt-6 max-w-xl text-base leading-relaxed text-mist md:text-lg"
              style={{ "--d": "700ms" } as React.CSSProperties}
            >
              {t("hero.subtitle")}
            </p>
            <div
              className="animate-fade-up mt-10 flex flex-wrap items-center gap-4"
              style={{ "--d": "850ms" } as React.CSSProperties}
            >
              <Link
                href="/calculator"
                className="horizon-gradient rounded-full px-7 py-3.5 text-sm font-medium text-night"
              >
                {t("hero.ctaPrimary")}
              </Link>
              <Link
                href="/projects"
                className="rounded-full border border-line-night px-7 py-3.5 text-sm font-medium text-day transition-colors hover:border-mist"
              >
                {t("hero.ctaSecondary")}
              </Link>
            </div>

            {/* Stats row (wolf reference) */}
            <div
              className="animate-fade-up mt-16 flex gap-10 md:gap-16"
              style={{ "--d": "1000ms" } as React.CSSProperties}
            >
              {(["projects", "years", "langs"] as const).map((key) => (
                <div key={key}>
                  <p className="font-display text-2xl font-medium md:text-3xl">
                    {t(`stats.${key}.value`)}
                  </p>
                  <p className="mt-1 font-mono text-xs uppercase tracking-wide text-mist">
                    {t(`stats.${key}.label`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Spotlight>
        <div
          className="animate-sunrise pointer-events-none absolute -bottom-24 right-8 h-48 w-48 md:-bottom-32 md:right-24 md:h-72 md:w-72"
          aria-hidden
        >
          <div className="sun-disc sun-aurora animate-sun-breathe h-full w-full" />
        </div>
        <div
          className="horizon-gradient animate-line-draw absolute bottom-0 h-px w-full opacity-80"
          aria-hidden
        />
      </section>

      {/* ——— Ticker along the horizon ——— */}
      <Marquee items={marqueeItems} />

      {/* ——— Services overview ——— */}
      <Section eyebrow={t("eyebrows.services")}>
        <div className="grid gap-10 md:grid-cols-[1fr_2fr]">
          <Reveal>
            <h2 className="font-display text-2xl font-medium md:text-3xl">
              {t("servicesTitle")}
            </h2>
          </Reveal>
          <div>
            {SERVICE_KEYS.map((key, i) => (
              <Reveal key={key} delay={i * 60}>
                <Link
                  href="/services"
                  className="group flex items-baseline justify-between gap-4 border-b border-line py-5 transition-colors hover:border-ink"
                >
                  <span className="text-lg font-medium transition-transform duration-300 group-hover:translate-x-1 md:text-xl">
                    {ts(`items.${key}.title`)}
                  </span>
                  <span className="shrink-0 font-mono text-sm text-muted">
                    {t("from")} {formatUsd(basePriceUsd(key))}
                    <span className="ml-3 inline-block transition-transform group-hover:translate-x-1">
                      →
                    </span>
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </Section>

      {/* ——— Selected projects: live previews ——— */}
      <Section eyebrow={t("eyebrows.projects")}>
        <div className="mb-10 flex items-end justify-between gap-4">
          <Reveal>
            <h2 className="font-display text-2xl font-medium md:text-3xl">
              {t("projectsTitle")}
            </h2>
          </Reveal>
          <Link
            href="/projects"
            className="shrink-0 font-mono text-sm text-muted transition-colors hover:text-ink"
          >
            {t("allProjects")} →
          </Link>
        </div>
        <div className="grid gap-8 sm:grid-cols-2">
          {featured.map((p, i) => (
            <Reveal key={p.slug} delay={i * 80}>
              <Link href={`/projects/${p.slug}`} className="group block">
                <PreviewCard
                  image={p.image}
                  title={p.title}
                  url={p.url}
                  sizes="(max-width: 640px) 100vw, 50vw"
                  priority={i < 2}
                />
                <div className="mt-4 flex items-baseline justify-between gap-3">
                  <span className="font-display text-lg">{p.title}</span>
                  <span className="font-mono text-xs uppercase tracking-wide text-mist">
                    {p.category} · {p.year}
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ——— About strip ——— */}
      <Section eyebrow={t("eyebrows.about")} tone="night">
        <div className="grid gap-8 md:grid-cols-2">
          <Reveal>
            <h2 className="font-display text-2xl font-medium md:text-3xl">
              {t("aboutTitle")}
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <p className="text-base leading-relaxed text-mist md:text-lg">
              {t("aboutText")}
            </p>
            <Link
              href="/about"
              className="mt-6 inline-block font-mono text-sm text-apricot transition-opacity hover:opacity-80"
            >
              {t("aboutLink")} →
            </Link>
          </Reveal>
        </div>
      </Section>

      {/* ——— Tech stack (udevs-style category grid) ——— */}
      <Section eyebrow={t("eyebrows.stack")}>
        <div className="mb-10 grid gap-4 md:grid-cols-2 md:items-end">
          <Reveal>
            <h2 className="font-display text-2xl font-medium md:text-3xl">
              {t("stackTitle")}
            </h2>
          </Reveal>
          <Reveal delay={80}>
            <p className="text-muted md:text-right">{t("stackText")}</p>
          </Reveal>
        </div>
        <TechStack />
      </Section>

      {/* ——— Process ——— */}
      <Section eyebrow={t("eyebrows.process")}>
        <Reveal>
          <h2 className="font-display mb-12 text-2xl font-medium md:text-3xl">
            {t("processTitle")}
          </h2>
        </Reveal>
        <ProcessSteps />
      </Section>

      {/* ——— Calculator CTA (hidden on mobile: hero already has this CTA) ——— */}
      <Section eyebrow={t("eyebrows.calculator")} tone="night" className="hidden md:block">
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <Reveal>
              <h2 className="font-display max-w-xl text-2xl font-medium md:text-3xl">
                {t("calcTitle")}
              </h2>
            </Reveal>
            <Reveal delay={80}>
              <p className="mt-4 max-w-lg text-mist">{t("calcText")}</p>
            </Reveal>
          </div>
          <Link
            href="/calculator"
            className="horizon-gradient shrink-0 rounded-full px-8 py-4 text-sm font-medium text-night"
          >
            {t("hero.ctaPrimary")}
          </Link>
        </div>
      </Section>

      {/* ——— Final CTA ——— */}
      <Section eyebrow={t("eyebrows.contact")}>
        <div className="flex flex-col items-start gap-6">
          <Reveal>
            <h2 className="font-display max-w-2xl text-2xl font-medium md:text-4xl">
              {t("finalTitle")}
            </h2>
          </Reveal>
          <Link
            href="/contact"
            className="rounded-full bg-night px-8 py-4 text-sm font-medium text-day transition-all hover:shadow-[0_10px_30px_rgba(19,26,44,0.35)]"
          >
            {t("finalCta")}
          </Link>
        </div>
      </Section>
    </main>
  );
}

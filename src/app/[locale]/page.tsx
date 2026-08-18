import Image from "next/image";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { projects } from "@/data/projects";
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

const PROCESS_STEPS = ["brief", "estimate", "design", "build", "launch"] as const;

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const ts = await getTranslations("services");
  const featured = projects.slice(0, 3);

  return (
    <main>
      {/* ——— Hero: night sky, the sun rises over the horizon ——— */}
      <section className="relative overflow-hidden bg-night text-day">
        <div className="mx-auto flex max-w-6xl flex-col px-5 pb-40 pt-20 md:px-8 md:pb-56 md:pt-28">
          <h1 className="font-display max-w-3xl text-3xl font-medium leading-tight md:text-5xl md:leading-[1.15]">
            {t("hero.title")}
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-mist md:text-lg">
            {t("hero.subtitle")}
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/calculator"
              className="horizon-gradient rounded-full px-7 py-3.5 text-sm font-medium text-night transition-opacity hover:opacity-90"
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
        </div>
        {/* The sun — clipped by the hero's bottom edge (the horizon). */}
        <div
          className="sun-disc animate-sunrise pointer-events-none absolute -bottom-24 right-8 h-48 w-48 md:-bottom-32 md:right-24 md:h-72 md:w-72"
          aria-hidden
        />
        <div className="horizon-gradient absolute bottom-0 h-px w-full opacity-80" aria-hidden />
      </section>

      {/* ——— Services overview: table rows, price anchors from the engine ——— */}
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
                  <span className="text-lg font-medium md:text-xl">
                    {ts(`items.${key}.title`)}
                  </span>
                  <span className="shrink-0 font-mono text-sm text-muted">
                    {t("from")} {formatUsd(basePrices[key].price)}
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

      {/* ——— Selected projects ——— */}
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
        <div className="grid gap-6 md:grid-cols-3">
          {featured.map((p, i) => (
            <Reveal key={p.slug} delay={i * 80}>
              <Link href={`/projects/${p.slug}`} className="group block">
                <div className="relative flex aspect-[4/3] items-end overflow-hidden rounded-xl bg-night transition-transform duration-300 group-hover:-translate-y-1">
                  <Image
                    src={p.image}
                    alt={p.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-night/80 via-transparent to-transparent"
                    aria-hidden
                  />
                  <span className="font-display relative p-5 text-lg text-day">
                    {p.title}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-muted">{p.description.slice(0, 60)}…</span>
                </div>
                <span className="font-mono text-xs uppercase text-mist">
                  {p.category} · {p.year}
                </span>
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

      {/* ——— Process: a real sequence, numbering carries meaning ——— */}
      <Section eyebrow={t("eyebrows.process")}>
        <Reveal>
          <h2 className="font-display mb-12 text-2xl font-medium md:text-3xl">
            {t("processTitle")}
          </h2>
        </Reveal>
        <ol className="grid gap-8 md:grid-cols-5">
          {PROCESS_STEPS.map((step, i) => (
            <Reveal key={step} delay={i * 70}>
              <li>
                <span className="font-mono text-xs text-afterglow">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-2 font-medium">{t(`process.${step}.title`)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {t(`process.${step}.text`)}
                </p>
              </li>
            </Reveal>
          ))}
        </ol>
      </Section>

      {/* ——— Calculator CTA: the pitch for the signature feature ——— */}
      <Section eyebrow={t("eyebrows.calculator")} tone="night">
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
            className="horizon-gradient shrink-0 rounded-full px-8 py-4 text-sm font-medium text-night transition-opacity hover:opacity-90"
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
            className="rounded-full bg-night px-8 py-4 text-sm font-medium text-day transition-opacity hover:opacity-90"
          >
            {t("finalCta")}
          </Link>
        </div>
      </Section>
    </main>
  );
}

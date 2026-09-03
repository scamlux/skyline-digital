import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { projects } from "@/data/projects";
import { getProject } from "@/lib/portfolio";
import { localeUrl, languageAlternates, SITE_URL, SITE_NAME } from "@/lib/seo";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    projects.map((p) => ({ locale, slug: p.slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const project = await getProject(slug);
  if (!project) return {};
  const path = `/projects/${slug}`;
  return {
    title: `${project.title} — ${project.category} project`,
    description: project.description,
    alternates: {
      canonical: localeUrl(locale, path),
      languages: languageAlternates(path),
    },
    openGraph: {
      type: "article",
      title: project.title,
      description: project.description,
      url: localeUrl(locale, path),
      images: [{ url: project.image, alt: project.title }],
    },
    twitter: { card: "summary_large_image", images: [project.image] },
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("project");
  const project = await getProject(slug);
  if (!project) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.title,
    description: project.description,
    url: localeUrl(locale, `/projects/${slug}`),
    image: `${SITE_URL}${project.image}`,
    dateCreated: String(project.year),
    keywords: project.technologies.join(", "),
    creator: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="relative overflow-hidden bg-night text-day">
        <div className="mx-auto max-w-6xl px-5 pb-24 pt-12 md:px-8 md:pb-32 md:pt-20">
          <Link
            href="/projects"
            className="font-mono text-xs uppercase tracking-wide text-mist transition-colors hover:text-day"
          >
            ← {t("back")}
          </Link>
          <h1 className="font-display mt-6 text-3xl font-medium md:text-5xl">
            {project.title}
          </h1>
          <p className="mt-5 max-w-2xl text-mist md:text-lg">{project.description}</p>
        </div>
        <div
          className="sun-disc pointer-events-none absolute -bottom-20 right-10 h-40 w-40 opacity-70 md:h-56 md:w-56"
          aria-hidden
        />
        <div className="horizon-gradient absolute bottom-0 h-px w-full opacity-80" aria-hidden />
      </section>

      <div className="bg-day">
        <div className="group mx-auto max-w-6xl px-5 pt-14 md:px-8 md:pt-20">
          <div className="overflow-hidden rounded-xl border border-line bg-night-deep shadow-[0_20px_60px_rgba(19,26,44,0.15)]">
            <div className="flex items-center gap-2 border-b border-line-night bg-night px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-afterglow/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-apricot/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-mist/40" />
              <span className="ml-3 truncate rounded-md bg-night-deep px-3 py-1 font-mono text-[10px] text-mist">
                {project.url ? new URL(project.url).host : project.slug}
              </span>
            </div>
            <div className="preview-zoom preview-loading relative aspect-video overflow-hidden">
              <Image
                src={project.image}
                alt={project.title}
                fill
                sizes="(max-width: 1152px) 100vw, 1152px"
                className="object-cover object-top"
                priority
              />
            </div>
          </div>
        </div>
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-3 md:px-8 md:py-20">
          <div>
            <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-muted">
              {t("category")}
            </h2>
            <p className="mt-2 capitalize">{project.category}</p>
          </div>
          <div>
            <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-muted">
              {t("year")}
            </h2>
            <p className="mt-2">{project.year}</p>
          </div>
          <div>
            <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-muted">
              {t("technologies")}
            </h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {project.technologies.map((tech) => (
                <span
                  key={tech}
                  className="rounded-full border border-line px-3 py-1 text-xs"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>

        {project.url && (
          <div className="mx-auto max-w-6xl px-5 pb-10 md:px-8">
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-sm text-afterglow hover:opacity-80"
            >
              {t("visit")} ↗
            </a>
          </div>
        )}

        <div className="border-t border-line">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-5 px-5 py-14 md:px-8 md:py-20">
            <h2 className="font-display text-2xl font-medium md:text-3xl">
              {t("ctaTitle")}
            </h2>
            <Link
              href="/calculator"
              className="rounded-full bg-night px-7 py-3.5 text-sm font-medium text-day transition-opacity hover:opacity-90"
            >
              {t("cta")}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

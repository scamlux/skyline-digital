import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { ProjectsGrid } from "@/components/projects/ProjectsGrid";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "projects" });
  return { title: t("title"), description: t("intro") };
}

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("projects");

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
        <div className="mx-auto max-w-6xl px-5 py-12 md:px-8 md:py-16">
          <ProjectsGrid />
        </div>
      </div>
    </main>
  );
}

import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { AuditRunner } from "@/components/audit/AuditRunner";
import { localeUrl, languageAlternates } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "audit" });
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: {
      canonical: localeUrl(locale, "/audit"),
      languages: languageAlternates("/audit"),
    },
  };
}

export default async function AuditPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "audit" });

  return (
    <main className="bg-day">
      <section className="mx-auto max-w-4xl px-5 py-20 md:px-8 md:py-28">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-apricot">
          {t("eyebrow")}
        </p>
        <h1 className="font-display mt-4 text-3xl font-medium text-ink md:text-5xl">
          {t("title")}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted md:text-lg">
          {t("subtitle")}
        </p>
        <div className="mt-10">
          <AuditRunner />
        </div>
      </section>
    </main>
  );
}

import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Wizard } from "@/components/calculator/Wizard";
import { localeUrl, languageAlternates } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "calc" });
  return {
    title: t("title"),
    description: t("intro"),
    alternates: {
      canonical: localeUrl(locale, "/calculator"),
      languages: languageAlternates("/calculator"),
    },
  };
}

export default async function CalculatorPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { locale } = await params;
  const { type } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("calc");

  return (
    <main className="relative overflow-hidden bg-night text-day">
      <div className="stars-far" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-12 md:px-8 md:pb-28 md:pt-16">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display animate-fade-up text-3xl font-medium md:text-4xl">
            {t("title")}
          </h1>
          <p
            className="animate-fade-up mt-4 max-w-xl text-mist"
            style={{ "--d": "150ms" } as React.CSSProperties}
          >
            {t("intro")}
          </p>
        </div>
        <div
          className="animate-fade-up mt-12"
          style={{ "--d": "300ms" } as React.CSSProperties}
        >
          <Wizard initialType={type} />
        </div>
      </div>
    </main>
  );
}

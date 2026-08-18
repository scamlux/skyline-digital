import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Wizard } from "@/components/calculator/Wizard";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "calc" });
  return { title: t("title"), description: t("intro") };
}

export default async function CalculatorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("calc");

  return (
    <main className="bg-night text-day">
      <div className="mx-auto max-w-6xl px-5 pb-20 pt-12 md:px-8 md:pb-28 md:pt-16">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-3xl font-medium md:text-4xl">{t("title")}</h1>
          <p className="mt-4 max-w-xl text-mist">{t("intro")}</p>
        </div>
        <div className="mt-12">
          <Wizard />
        </div>
      </div>
    </main>
  );
}

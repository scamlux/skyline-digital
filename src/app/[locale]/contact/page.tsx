import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ContactForm } from "@/components/contact/ContactForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });
  return { title: t("title"), description: t("intro") };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("contact");

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
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-14 md:grid-cols-[3fr_2fr] md:px-8 md:py-20">
          <ContactForm />
          <aside className="h-fit rounded-xl border border-line bg-surface p-8">
            <h2 className="font-display text-lg font-medium">{t("altTitle")}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">{t("altText")}</p>
            <Link
              href="/calculator"
              className="horizon-gradient mt-6 inline-block rounded-full px-6 py-3 text-sm font-medium text-night transition-opacity hover:opacity-90"
            >
              {t("altCta")}
            </Link>
          </aside>
        </div>
      </div>
    </main>
  );
}

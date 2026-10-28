import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { demoUi, localePath } from "@/site-templates/demo";
import { TEMPLATES, getTemplate } from "@/site-templates/registry";
import { LOCALES, pick, type Locale, type StyleId } from "@/site-templates/types";

export function generateStaticParams() {
  return TEMPLATES.flatMap((t) => t.styles.map((s) => ({ niche: t.id, style: s.id })));
}

type Params = { locale: string; niche: string; style: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { niche } = await params;
  const tpl = getTemplate(niche);
  // Демо на нашем домене — в индекс не нужно.
  return { title: tpl ? `${tpl.demoName} — демо` : "Демо", robots: { index: false, follow: false } };
}

export default async function TemplatePage({ params }: { params: Promise<Params> }) {
  const { locale: raw, niche, style } = await params;
  if (!hasLocale(routing.locales, raw)) notFound();
  const locale = raw as Locale;
  setRequestLocale(locale);
  const tpl = getTemplate(niche);
  const st = tpl?.styles.find((s) => s.id === style);
  if (!tpl || !st) notFound();

  const path = `/sites/${tpl.id}/${st.id}`;
  const localeHrefs = Object.fromEntries(LOCALES.map((l) => [l, localePath(l, path)])) as Record<Locale, string>;
  const t = (l: Parameters<typeof pick>[0]) => pick(l, locale);

  return (
    <>
      {/* Слой «демо»: к самому шаблону не относится и на сайт клиента не попадает. */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 bg-night px-4 py-2 text-sm text-day md:px-8">
        <p className="flex items-center gap-3">
          <span className="rounded bg-apricot px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-night">{t(demoUi.badge)}</span>
          <span className="hidden sm:inline">{t(demoUi.ribbon)}</span>
        </p>
        <nav aria-label={t(demoUi.style)} className="flex items-center gap-1">
          <a href={localePath(locale, "/sites")} className="mr-2 hidden px-2 py-2 text-mist hover:text-day md:inline">
            {t(demoUi.back)}
          </a>
          {tpl.styles.map((s) => (
            <a
              key={s.id}
              href={localePath(locale, `/sites/${tpl.id}/${s.id}`)}
              aria-current={s.id === st.id ? "page" : undefined}
              className={`inline-flex min-h-[44px] items-center rounded-full px-3 py-1 ${s.id === st.id ? "bg-day text-night" : "border border-line-night text-day hover:border-day"}`}
            >
              <span className="sr-only">{t(demoUi.style)} </span>
              {s.id.toUpperCase()}<span className="hidden md:inline"> · {t(s.name)}</span>
            </a>
          ))}
          <a href={localePath(locale, "/contact")} className="ml-2 inline-flex min-h-[44px] items-center rounded-full bg-apricot px-4 font-medium text-night hover:opacity-90">
            {t(demoUi.order)}
          </a>
        </nav>
      </div>
      {tpl.render({ locale, style: st.id as StyleId, localeHrefs })}
    </>
  );
}

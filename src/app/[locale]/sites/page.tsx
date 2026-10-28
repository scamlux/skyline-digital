import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { demoUi, localePath, upcoming } from "@/site-templates/demo";
import { TEMPLATES } from "@/site-templates/registry";
import { pick, type Locale } from "@/site-templates/types";

// Витрина шаблонов — для показа клиентам, в поиск не нужна.
export const metadata: Metadata = { title: "Сайты для бизнеса по подписке", robots: { index: false, follow: false } };

export default async function ShowroomPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!hasLocale(routing.locales, raw)) notFound();
  const locale = raw as Locale;
  setRequestLocale(locale);
  const t = (l: Parameters<typeof pick>[0]) => pick(l, locale);

  return (
    <main className="min-h-screen bg-day text-ink">
      <div className="mx-auto max-w-5xl px-5 py-12 md:px-8 md:py-20">
        <a href={localePath(locale, "/")} className="text-sm text-muted hover:text-ink">
          Skyline Digital
        </a>
        <h1 className="font-display mt-6 text-3xl font-medium md:text-5xl">{t(demoUi.showroomTitle)}</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">{t(demoUi.showroomLead)}</p>
        <p className="mt-2 max-w-2xl text-sm text-muted">{t(demoUi.includes)}</p>

        <ul className="mt-12 grid gap-6 md:grid-cols-2">
          {TEMPLATES.map((tpl) => (
            <li key={tpl.id} className="rounded-2xl border border-line bg-surface p-6 md:p-8">
              <h2 className="font-display text-2xl font-medium">{t(tpl.title)}</h2>
              <p className="mt-2 text-muted">{t(tpl.blurb)}</p>
              <ul className="mt-6 grid gap-3">
                {tpl.styles.map((s) => (
                  <li key={s.id}>
                    <a
                      href={localePath(locale, `/sites/${tpl.id}/${s.id}`)}
                      className="flex min-h-[56px] flex-col items-start justify-between gap-2 rounded-xl border border-line px-4 py-3 transition-colors hover:border-ink sm:flex-row sm:items-center sm:gap-4"
                    >
                      <span>
                        <span className="block font-medium">{t(s.name)}</span>
                        <span className="block text-sm text-muted">{t(s.mood)}</span>
                      </span>
                      <span className="shrink-0 text-sm font-medium">{t(demoUi.open)} →</span>
                    </a>
                  </li>
                ))}
              </ul>
            </li>
          ))}
          {upcoming.map((u) => (
            <li key={u.id} className="rounded-2xl border border-dashed border-line p-6 md:p-8 text-muted">
              <h2 className="font-display text-2xl font-medium">{t(u.title)}</h2>
              <p className="mt-2">{t(demoUi.soon)}</p>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

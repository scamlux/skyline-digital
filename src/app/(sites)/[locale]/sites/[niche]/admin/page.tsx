import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { localePath } from "@/site-templates/demo";
import { TEMPLATES, getTemplate } from "@/site-templates/registry";
import { LOCALES, type Locale } from "@/site-templates/types";

export function generateStaticParams() {
  return TEMPLATES.filter((t) => t.renderAdmin).map((t) => ({ niche: t.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ niche: string }> }): Promise<Metadata> {
  const { niche } = await params;
  const tpl = getTemplate(niche);
  return { title: tpl ? `${tpl.demoName} — кабинет` : "Кабинет", robots: { index: false, follow: false } };
}

/** Демо-кабинет владельца: /sites/<ниша>/admin. Данные — в браузере (см. store.ts шаблона). */
export default async function AdminPage({ params }: { params: Promise<{ locale: string; niche: string }> }) {
  const { locale: raw, niche } = await params;
  if (!hasLocale(routing.locales, raw)) notFound();
  const locale = raw as Locale;
  setRequestLocale(locale);
  const tpl = getTemplate(niche);
  if (!tpl?.renderAdmin) notFound();
  const path = `/sites/${tpl.id}/admin`;
  const localeHrefs = Object.fromEntries(LOCALES.map((l) => [l, localePath(l, path)])) as Record<Locale, string>;
  return tpl.renderAdmin({ locale, localeHrefs, siteHref: localePath(locale, `/sites/${tpl.id}/${tpl.styles[0].id}`) });
}

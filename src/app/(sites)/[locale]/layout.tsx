import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Analytics } from "@vercel/analytics/next";
import type { Viewport } from "next";
import { routing } from "@/i18n/routing";
import "../sites.css";

/**
 * Лёгкий корневой макет для /sites: демо-сайты и их кабинет не должны таскать за собой
 * шрифты, провайдер переводов и скрипты основного сайта студии (это ~170 КБ шрифтов и
 * лишний JS на каждую страницу). Шаблон сам подключает свои стили и шрифты.
 */
export const viewport: Viewport = { themeColor: "#ffffff", colorScheme: "light dark" };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function SitesLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return (
    <html lang={locale} className="h-full antialiased" style={{ fontFamily: '"Onest", system-ui, sans-serif' }}>
      <body className="flex min-h-full flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}

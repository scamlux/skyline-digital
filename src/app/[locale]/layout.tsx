import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Unbounded, Golos_Text, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { routing } from "@/i18n/routing";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Loader } from "@/components/ui/Loader";
import {
  SITE_NAME,
  SITE_URL,
  seoByLocale,
  localeUrl,
  languageAlternates,
  organizationJsonLd,
} from "@/lib/seo";
import "../globals.css";

const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
});

const golos = Golos_Text({
  variable: "--font-golos",
  subsets: ["latin", "cyrillic"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
});

export const viewport: Viewport = {
  themeColor: "#1a2238",
  colorScheme: "dark light",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const seo = seoByLocale[locale] ?? seoByLocale.ru;
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: seo.title,
      template: `%s · ${SITE_NAME}`,
    },
    description: seo.description,
    keywords: seo.keywords,
    applicationName: SITE_NAME,
    authors: [{ name: SITE_NAME }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    alternates: {
      canonical: localeUrl(locale),
      languages: languageAlternates(),
    },
    verification: {
      google: "K1irlh1clUwvZCKdyh2BXL3je9YFyj4kTZhv8ONsSLQ",
      yandex: "c817fa8aebc9d96b",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: seo.title,
      description: seo.description,
      url: localeUrl(locale),
      locale: seo.ogLocale,
      images: [
        { url: "/opengraph-image", width: 1200, height: 630, alt: SITE_NAME },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      images: ["/opengraph-image"],
    },
    category: "technology",
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      className={`${unbounded.variable} ${golos.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <script
          type="application/ld+json"
          // Organization + WebSite structured data for rich results.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd(locale)),
          }}
        />
        <NextIntlClientProvider>
          <Loader />
          <Header />
          <div className="flex-1">{children}</div>
          <Footer />
        </NextIntlClientProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
